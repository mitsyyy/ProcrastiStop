const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainActivity,
  withMainApplication,
} = require('expo/config-plugins');
const { addImports } = require('@expo/config-plugins/build/android/codeMod');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

const REQUIRED_ANDROID_PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.WAKE_LOCK',
  'android.permission.VIBRATE',
  'android.permission.RECEIVE_BOOT_COMPLETED',
];

const RECEIVER_NAME = '.FocusAlarmNotificationsService';
const SWIPE_KILL_RECEIVER_NAME = '.SwipeKillAlarmReceiver';
const FOREGROUND_SERVICE_NAME = '.FocusSessionForegroundService';

function buildKotlinServiceSource(packageName, scheme) {
  return `package ${packageName}

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationBehaviorRecord
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import expo.modules.notifications.service.interfaces.PresentationDelegate

/**
 * High-priority extension of Expo's NotificationsService that elevates scheduled
 * auto-start focus alarms into:
 * 1) Native full-screen lock-screen alarm intents (CATEGORY_ALARM + WakeLock)
 * 2) Direct background Activity launch over other apps when SYSTEM_ALERT_WINDOW is granted
 *
 * Launches the Hands-Free AI Camera Checkpoint Gate FIRST so the user verifies their workspace item
 * to silence the alarm and unlock the focus countdown.
 */
class FocusAlarmNotificationsService : NotificationsService() {
  override fun getPresentationDelegate(context: Context): PresentationDelegate =
    FocusAlarmPresentationDelegate(context)
}

class FocusAlarmPresentationDelegate(context: Context) : ExpoPresentationDelegate(context) {
  override suspend fun createNotification(
    notification: Notification,
    notificationBehavior: NotificationBehaviorRecord?
  ): android.app.Notification {
    val built = super.createNotification(notification, notificationBehavior)
    val data = notification.notificationRequest.content.body
    val isFullScreenAlarm =
      data?.optBoolean("fullScreenAlarm", false) == true ||
        data?.optString("kind", "") == "auto_start"

    if (isFullScreenAlarm) {
      try {
        val taskId = data?.optString("taskId", "") ?: ""
        val deepLinkUri = Uri.Builder()
          .scheme("${scheme}")
          .authority("focus")
          .appendPath("checkpoint")
          .appendQueryParameter("mode", "gate")
          .appendQueryParameter("alarm", "1")
          .apply {
            if (taskId.isNotEmpty()) appendQueryParameter("taskId", taskId)
          }
          .build()

        val launchIntent = Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
          setPackage(context.packageName)
          addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
              Intent.FLAG_ACTIVITY_CLEAR_TOP or
              Intent.FLAG_ACTIVITY_SINGLE_TOP or
              Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
          )
        }

        val pendingFlags =
          PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

        val requestCode = notification.notificationRequest.identifier.hashCode()
        val fullScreenPendingIntent = PendingIntent.getActivity(
          context,
          requestCode,
          launchIntent,
          pendingFlags
        )

        built.category = android.app.Notification.CATEGORY_ALARM
        built.fullScreenIntent = fullScreenPendingIntent
        built.contentIntent = fullScreenPendingIntent

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        if (powerManager != null) {
          try {
            @Suppress("DEPRECATION")
            val wakeLock = powerManager.newWakeLock(
              PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
              "\${context.packageName}:FocusAlarmWakeLock"
            )
            wakeLock.acquire(8_000L)
          } catch (wakeErr: Exception) {
            Log.w("FocusAlarmService", "Screen wake lock skipped: \${wakeErr.message}")
          }
        }

        val canDrawOverlays =
          Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
        if (canDrawOverlays) {
          Handler(Looper.getMainLooper()).post {
            try {
              context.startActivity(launchIntent)
            } catch (launchErr: Exception) {
              Log.w("FocusAlarmService", "Direct overlay launch fell back to fullScreenIntent: \${launchErr.message}")
            }
          }
        }
      } catch (e: Exception) {
        Log.e("FocusAlarmService", "Unable to attach full-screen focus alarm intent: \${e.message}", e)
      }
    }

    return built
  }
}
`;
}

function buildKotlinForegroundServiceSource(packageName, scheme) {
  return `package ${packageName}

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.AlarmManagerCompat
import androidx.core.app.NotificationCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Foreground service that:
 * 1) Displays a persistent live-updating countdown timer notification when user switches apps.
 * 2) Detects explicit swipe-kill from Recent Tasks via onTaskRemoved(), immediately marking
 *    the active session/task as Skipped (+1h) OR Missed (past due cutoff) and arming native
 *    +55m warning & +60m alarm triggers strictly before task dueDate.
 */
class FocusSessionForegroundService : Service() {
  companion object {
    const val CHANNEL_ID = "procrastistop-live-timer"
    const val ALERT_CHANNEL_ID = "procrastistop-reminders"
    const val NOTIFICATION_ID = 4102
    const val SKIP_NOTICE_ID = 4109
    const val PREFS_NAME = "procrastistop_swipe_kill_prefs"

    const val ACTION_START = "com.procrastistop.action.START_TIMER"
    const val ACTION_PAUSE = "com.procrastistop.action.PAUSE_TIMER"
    const val ACTION_STOP = "com.procrastistop.action.STOP_TIMER"

    const val EXTRA_SESSION_ID = "sessionId"
    const val EXTRA_TASK_ID = "taskId"
    const val EXTRA_TASK_TITLE = "taskTitle"
    const val EXTRA_END_MS = "endTimestampMs"
    const val EXTRA_REMAINING_SECONDS = "remainingSeconds"
    const val EXTRA_PLANNED_SECONDS = "plannedSeconds"
    const val EXTRA_DEADLINE_MS = "deadlineMs"
  }

  private val handler = Handler(Looper.getMainLooper())
  private var isTrackingActive = false
  private var isPaused = false
  private var sessionId: String = ""
  private var taskId: String = ""
  private var taskTitle: String = "Focus Session"
  private var endTimestampMs: Long = 0L
  private var pausedRemainingSeconds: Int = 0
  private var plannedSeconds: Int = 2700
  private var deadlineMs: Long = 0L

  private val tickRunnable = object : Runnable {
    override fun run() {
      if (!isTrackingActive || isPaused) return
      val remainingSec = ((endTimestampMs - System.currentTimeMillis()) / 1000L).toInt()
      if (remainingSec <= 0) {
        stopServiceCleanly()
        return
      }
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.notify(NOTIFICATION_ID, buildLiveNotification(remainingSec, false))
      handler.postDelayed(this, 1000L)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureLiveChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        sessionId = intent.getStringExtra(EXTRA_SESSION_ID) ?: ""
        taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: ""
        taskTitle = intent.getStringExtra(EXTRA_TASK_TITLE) ?: "Focus Session"
        endTimestampMs = intent.getLongExtra(EXTRA_END_MS, 0L)
        plannedSeconds = intent.getIntExtra(EXTRA_PLANNED_SECONDS, 2700).coerceAtLeast(60)
        deadlineMs = intent.getLongExtra(EXTRA_DEADLINE_MS, 0L)
        isTrackingActive = true
        isPaused = false

        val initialRemaining = ((endTimestampMs - System.currentTimeMillis()) / 1000L)
          .toInt()
          .coerceAtLeast(1)
        startInForeground(buildLiveNotification(initialRemaining, false))
        handler.removeCallbacks(tickRunnable)
        handler.postDelayed(tickRunnable, 1000L)
      }

      ACTION_PAUSE -> {
        if (isTrackingActive) {
          isPaused = true
          pausedRemainingSeconds = intent.getIntExtra(EXTRA_REMAINING_SECONDS, 0).coerceAtLeast(0)
          handler.removeCallbacks(tickRunnable)
          val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
          nm.notify(NOTIFICATION_ID, buildLiveNotification(pausedRemainingSeconds, true))
        }
      }

      ACTION_STOP -> {
        stopServiceCleanly()
      }
    }
    return START_NOT_STICKY
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    if (!isTrackingActive) {
      stopSelf()
      return
    }

    val nowMs = System.currentTimeMillis()
    val stillIncomplete = isPaused || endTimestampMs > nowMs + 2000L

    if (stillIncomplete) {
      try {
        val rescheduledAtMs = nowMs + 60L * 60L * 1000L
        val preWarnAtMs = rescheduledAtMs - 5L * 60L * 1000L
        val exceedsDueDate =
          deadlineMs > 0L && (nowMs >= deadlineMs || rescheduledAtMs >= deadlineMs)

        // Persist swipe-kill record so JS reconciles session & task state on next open
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().apply {
          putBoolean("pending", true)
          putString("sessionId", sessionId)
          putString("taskId", taskId)
          putString("taskTitle", taskTitle)
          putLong("terminatedAtMs", nowMs)
          putLong("rescheduledAtMs", if (exceedsDueDate) 0L else rescheduledAtMs)
          putBoolean("pastDue", exceedsDueDate)
          commit()
        }

        ensureAlertChannel()
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (exceedsDueDate) {
          // Past Due Date Cutoff: cancel alarms permanently and mark Missed (zero +1h retries)
          val notice = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
            .setSmallIcon(applicationInfo.icon)
            .setContentTitle("Session marked Missed")
            .setContentText("\\"\$taskTitle\\" was closed near/past its due date. Alarms cancelled.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
          nm.notify(SKIP_NOTICE_ID, notice)
        } else {
          // Schedule native +55m pre-session warning and +60m full-screen AI Camera Gate alarm
          scheduleNativeAlarm(
            triggerAtMs = preWarnAtMs,
            kind = SwipeKillAlarmReceiver.KIND_PRE_WARNING,
            requestCode = 9101
          )
          scheduleNativeAlarm(
            triggerAtMs = rescheduledAtMs,
            kind = SwipeKillAlarmReceiver.KIND_AUTO_START,
            requestCode = 9102
          )

          val nextLabel = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(rescheduledAtMs))
          val notice = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
            .setSmallIcon(applicationInfo.icon)
            .setContentTitle("Session marked Skipped")
            .setContentText("\\"\$taskTitle\\" was closed early and auto-rescheduled for \$nextLabel (+1 hr).")
            .setStyle(
              NotificationCompat.BigTextStyle().bigText(
                "You closed ProcrastiStop during \\"\$taskTitle\\". It has been marked Skipped (not Completed) and rescheduled for \$nextLabel with a 5-min warning & alarm."
              )
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
          nm.notify(SKIP_NOTICE_ID, notice)
        }
      } catch (e: Exception) {
        Log.e("FocusSessionService", "Swipe-kill auto-skip failed: \${e.message}", e)
      }
    }

    stopServiceCleanly()
  }

  private fun scheduleNativeAlarm(triggerAtMs: Long, kind: String, requestCode: Int) {
    val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    val intent = Intent(this, SwipeKillAlarmReceiver::class.java).apply {
      putExtra(SwipeKillAlarmReceiver.EXTRA_KIND, kind)
      putExtra(SwipeKillAlarmReceiver.EXTRA_TASK_ID, taskId)
      putExtra(SwipeKillAlarmReceiver.EXTRA_TASK_TITLE, taskTitle)
    }
    val flags =
      PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    val pending = PendingIntent.getBroadcast(this, requestCode, intent, flags)

    val canExact =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
    if (canExact) {
      val launch = packageManager.getLaunchIntentForPackage(packageName)
      val showIntent = if (launch != null) {
        PendingIntent.getActivity(this, 0, launch, flags)
      } else {
        null
      }
      alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAtMs, showIntent), pending)
    } else {
      AlarmManagerCompat.setAndAllowWhileIdle(alarmManager, AlarmManager.RTC_WAKEUP, triggerAtMs, pending)
    }
  }

  private fun startInForeground(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun stopServiceCleanly() {
    isTrackingActive = false
    isPaused = false
    handler.removeCallbacks(tickRunnable)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  override fun onDestroy() {
    handler.removeCallbacks(tickRunnable)
    super.onDestroy()
  }

  private fun ensureLiveChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) == null) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Active Focus Timer",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Shows live countdown while a ProcrastiStop focus session is running."
        setShowBadge(false)
        setSound(null, null)
        enableVibration(false)
      }
      nm.createNotificationChannel(channel)
    }
  }

  private fun ensureAlertChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(ALERT_CHANNEL_ID) == null) {
      val channel = NotificationChannel(
        ALERT_CHANNEL_ID,
        "Focus & Pre-Session Reminders",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "High-priority focus reminders and skip-reschedule alerts."
        enableVibration(true)
      }
      nm.createNotificationChannel(channel)
    }
  }

  private fun buildLiveNotification(remainingSeconds: Int, paused: Boolean): Notification {
    val mins = remainingSeconds / 60
    val secs = remainingSeconds % 60
    val formatted = String.format(Locale.US, "%02d:%02d", mins, secs)
    val elapsed = (plannedSeconds - remainingSeconds).coerceIn(0, plannedSeconds)

    val openIntent = Intent(
      Intent.ACTION_VIEW,
      Uri.parse("${scheme}://focus/active")
    ).apply {
      setPackage(packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val flags =
      PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    val contentIntent = PendingIntent.getActivity(this, NOTIFICATION_ID, openIntent, flags)

    val statusText = if (paused) {
      "Paused · \$formatted remaining"
    } else {
      "\$formatted remaining · Tap to return to focus"
    }

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Focusing: \$taskTitle")
      .setContentText(statusText)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(contentIntent)
      .setProgress(plannedSeconds, elapsed, false)

    if (!paused && endTimestampMs > System.currentTimeMillis()) {
      builder
        .setWhen(endTimestampMs)
        .setShowWhen(true)
        .setUsesChronometer(true)
        .setChronometerCountDown(true)
    }

    return builder.build()
  }
}
`;
}

function buildKotlinSwipeKillReceiverSource(packageName, scheme) {
  return `package ${packageName}

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Fires native rescheduled +55m pre-session warning and +60m full-screen AI Camera Gate alarm
 * triggered after the user swipe-killed ProcrastiStop during an active focus session.
 */
class SwipeKillAlarmReceiver : BroadcastReceiver() {
  companion object {
    const val EXTRA_KIND = "kind"
    const val EXTRA_TASK_ID = "taskId"
    const val EXTRA_TASK_TITLE = "taskTitle"
    const val KIND_PRE_WARNING = "pre_warning"
    const val KIND_AUTO_START = "auto_start"
  }

  private fun ensureChannels(nm: NotificationManager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    if (nm.getNotificationChannel("procrastistop-reminders") == null) {
      nm.createNotificationChannel(
        NotificationChannel(
          "procrastistop-reminders",
          "Focus & Pre-Session Reminders",
          NotificationManager.IMPORTANCE_HIGH
        )
      )
    }
    if (nm.getNotificationChannel("procrastistop-alarms") == null) {
      val alarmChannel = NotificationChannel(
        "procrastistop-alarms",
        "Focus Auto-Start Alarms",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        setSound(
          RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        enableVibration(true)
      }
      nm.createNotificationChannel(alarmChannel)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    val kind = intent.getStringExtra(EXTRA_KIND) ?: return
    val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: ""
    val taskTitle = intent.getStringExtra(EXTRA_TASK_TITLE) ?: "Focus Session"
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannels(nm)

    val pendingFlags =
      PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

    if (kind == KIND_PRE_WARNING) {
      val openUri = Uri.parse("${scheme}://focus/setup" + if (taskId.isNotEmpty()) "?taskId=\$taskId" else "")
      val openIntent = Intent(Intent.ACTION_VIEW, openUri).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      val pi = PendingIntent.getActivity(context, 9201, openIntent, pendingFlags)
      val notif = NotificationCompat.Builder(context, "procrastistop-reminders")
        .setSmallIcon(context.applicationInfo.icon)
        .setContentTitle("Rescheduled focus in 5 min")
        .setContentText("\\"\$taskTitle\\" restarts in 5 minutes. Prepare your workspace item.")
        .setPriority(NotificationCompat.PRIORITY_MAX)
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setAutoCancel(true)
        .setContentIntent(pi)
        .build()
      nm.notify(9201, notif)
      return
    }

    // Full-screen AI Camera Gate alarm wake-up
    val gateUri = Uri.Builder()
      .scheme("${scheme}")
      .authority("focus")
      .appendPath("checkpoint")
      .appendQueryParameter("mode", "gate")
      .appendQueryParameter("alarm", "1")
      .apply {
        if (taskId.isNotEmpty()) appendQueryParameter("taskId", taskId)
      }
      .build()

    val launchIntent = Intent(Intent.ACTION_VIEW, gateUri).apply {
      setPackage(context.packageName)
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
      )
    }

    val fullScreenPi = PendingIntent.getActivity(context, 9202, launchIntent, pendingFlags)
    val alarmNotif = NotificationCompat.Builder(context, "procrastistop-alarms")
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Time to focus: \$taskTitle")
      .setContentText("Hover over your workspace item to silence the alarm and restart your session.")
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setAutoCancel(true)
      .setContentIntent(fullScreenPi)
      .setFullScreenIntent(fullScreenPi, true)
      .build()

    nm.notify(9202, alarmNotif)

    try {
      val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      @Suppress("DEPRECATION")
      pm?.newWakeLock(
        PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
        "\${context.packageName}:SwipeKillAlarmWake"
      )?.acquire(8_000L)
    } catch (e: Exception) {
      Log.w("SwipeKillAlarmReceiver", "WakeLock skipped: \${e.message}")
    }

    val canDrawOverlays =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
    if (canDrawOverlays) {
      Handler(Looper.getMainLooper()).post {
        try {
          context.startActivity(launchIntent)
        } catch (e: Exception) {
          Log.w("SwipeKillAlarmReceiver", "Direct overlay startActivity skipped: \${e.message}")
        }
      }
    }
  }
}
`;
}

function buildKotlinLiveCameraSource(packageName) {
  return `package ${packageName}

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabel
import com.google.mlkit.vision.label.ImageLabeler
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Native CameraX + Center-ROI Cropping + Parallel Offline Google ML Kit Image Labeling & OCR View.
 * - Throttled ~400ms (~2.5 FPS) continuous hands-free analysis (zero shutter sound, zero saved files)
 * - Strictly closes ImageProxy on every code path
 * - Properly disposes ML Kit detectors & unbinds CameraX in dispose() so repeated scans never fail
 */
class FocusLiveCameraView(
  private val reactContext: ThemedReactContext
) : FrameLayout(reactContext) {

  private val previewView: PreviewView = PreviewView(reactContext).apply {
    layoutParams = LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    scaleType = PreviewView.ScaleType.FILL_CENTER
  }

  private val mainHandler = Handler(Looper.getMainLooper())
  private var analysisExecutor: ExecutorService? = null
  private var cameraProvider: ProcessCameraProvider? = null
  private var imageLabeler: ImageLabeler? = null
  private var textRecognizer: TextRecognizer? = null

  private val isProcessing = AtomicBoolean(false)
  @Volatile private var isDisposed = false
  @Volatile private var isActive = true
  @Volatile private var lensFacing: String = "back"
  @Volatile private var targetItem: String = "book"
  @Volatile private var lastAnalyzedAtMs: Long = 0L

  private val measureAndLayoutRunnable = Runnable {
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
    )
    layout(left, top, right, bottom)
  }

  init {
    addView(previewView)
  }

  override fun requestLayout() {
    super.requestLayout()
    post(measureAndLayoutRunnable)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    isDisposed = false
    startCameraPipeline()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    dispose()
  }

  fun setFacing(nextFacing: String?) {
    val clean = if (nextFacing == "front") "front" else "back"
    if (clean != lensFacing) {
      lensFacing = clean
      if (isAttachedToWindow && !isDisposed) {
        bindCameraUseCases()
      }
    }
  }

  fun setActive(active: Boolean) {
    isActive = active
  }

  fun setTargetItem(item: String?) {
    val clean = item?.trim()?.lowercase()?.takeIf { it.isNotEmpty() } ?: "book"
    targetItem = clean
  }

  private fun ensureDetectors() {
    if (imageLabeler == null) {
      val labelOpts = ImageLabelerOptions.Builder()
        .setConfidenceThreshold(0.42f)
        .build()
      imageLabeler = ImageLabeling.getClient(labelOpts)
    }
    if (textRecognizer == null) {
      textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }
    if (analysisExecutor == null || analysisExecutor?.isShutdown == true) {
      analysisExecutor = Executors.newSingleThreadExecutor()
    }
  }

  private fun startCameraPipeline() {
    val hasPerm = ContextCompat.checkSelfPermission(
      reactContext,
      Manifest.permission.CAMERA
    ) == PackageManager.PERMISSION_GRANTED
    if (!hasPerm) {
      emitStatus(false, "Camera permission is required for hands-free verification.")
      return
    }

    ensureDetectors()
    val providerFuture = ProcessCameraProvider.getInstance(reactContext)
    providerFuture.addListener(
      {
        if (isDisposed || !isAttachedToWindow) return@addListener
        try {
          cameraProvider = providerFuture.get()
          bindCameraUseCases()
        } catch (e: Exception) {
          Log.e("FocusLiveCameraView", "Failed to initialize CameraX: \${e.message}", e)
          emitStatus(false, e.message ?: "Unable to initialize live camera.")
        }
      },
      ContextCompat.getMainExecutor(reactContext)
    )
  }

  private fun bindCameraUseCases() {
    val provider = cameraProvider ?: return
    val lifecycleOwner = reactContext.currentActivity as? LifecycleOwner ?: return
    ensureDetectors()
    val executor = analysisExecutor ?: return

    try {
      provider.unbindAll()

      val preview = Preview.Builder().build().also {
        it.surfaceProvider = previewView.surfaceProvider
      }

      val analysis = ImageAnalysis.Builder()
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
        .build()

      analysis.setAnalyzer(executor) { imageProxy ->
        analyzeFrameSafely(imageProxy)
      }

      val selector = if (lensFacing == "front") {
        CameraSelector.DEFAULT_FRONT_CAMERA
      } else {
        CameraSelector.DEFAULT_BACK_CAMERA
      }

      provider.bindToLifecycle(lifecycleOwner, selector, preview, analysis)
      post(measureAndLayoutRunnable)
      emitStatus(true, null)
    } catch (e: Exception) {
      Log.e("FocusLiveCameraView", "CameraX bindToLifecycle failed: \${e.message}", e)
      emitStatus(false, e.message ?: "Unable to start live camera stream.")
    }
  }

  private fun analyzeFrameSafely(imageProxy: ImageProxy) {
    val nowMs = SystemClock.elapsedRealtime()
    if (
      isDisposed ||
      !isActive ||
      nowMs - lastAnalyzedAtMs < 380L ||
      !isProcessing.compareAndSet(false, true)
    ) {
      try {
        imageProxy.close()
      } catch (_: Exception) {
      }
      return
    }

    lastAnalyzedAtMs = nowMs
    val currentTarget = targetItem
    var roiBitmap: Bitmap? = null

    try {
      val labeler = imageLabeler
      val ocr = textRecognizer
      if (labeler == null || ocr == null || isDisposed) {
        isProcessing.set(false)
        imageProxy.close()
        return
      }

      val rawBitmap = imageProxy.toBitmap()
      val rotation = imageProxy.imageInfo.rotationDegrees
      val uprightBitmap = if (rotation != 0) {
        val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
        val rotated = Bitmap.createBitmap(
          rawBitmap,
          0,
          0,
          rawBitmap.width,
          rawBitmap.height,
          matrix,
          true
        )
        if (rotated !== rawBitmap) rawBitmap.recycle()
        rotated
      } else {
        rawBitmap
      }

      // Strictly crop to the center guide-box Region of Interest (68% width x 64% height)
      // Excludes patterned bedsheets, clothes, and background fabrics outside the viewfinder box.
      val cropW = (uprightBitmap.width * 0.68f).toInt().coerceAtLeast(64).coerceAtMost(uprightBitmap.width)
      val cropH = (uprightBitmap.height * 0.64f).toInt().coerceAtLeast(64).coerceAtMost(uprightBitmap.height)
      val cropLeft = ((uprightBitmap.width - cropW) / 2).coerceAtLeast(0)
      val cropTop = ((uprightBitmap.height - cropH) / 2).coerceAtLeast(0)

      val cropped = Bitmap.createBitmap(uprightBitmap, cropLeft, cropTop, cropW, cropH)
      roiBitmap = cropped
      if (cropped !== uprightBitmap) {
        uprightBitmap.recycle()
      }

      val inputImage = InputImage.fromBitmap(cropped, 0)
      val labelTask = labeler.process(inputImage)
      val ocrTask = ocr.process(inputImage)

      Tasks.whenAllComplete(labelTask, ocrTask).addOnCompleteListener {
        try {
          if (!isDisposed && isActive) {
            val labelsList: List<ImageLabel> =
              if (labelTask.isSuccessful) labelTask.result ?: emptyList() else emptyList()
            val ocrResult: Text? = if (ocrTask.isSuccessful) ocrTask.result else null
            val rawOcr = ocrResult?.text ?: ""
            val normalizedOcr = rawOcr.replace(Regex("\\\\s+"), " ").trim()
            val alphaNumCount = normalizedOcr.count { it.isLetterOrDigit() }
            val wordCount = normalizedOcr
              .split(" ")
              .count { token -> token.count { it.isLetterOrDigit() } >= 2 }

            emitFrameResult(
              target = currentTarget,
              labels = labelsList,
              ocrText = normalizedOcr.take(120),
              ocrWordCount = wordCount,
              ocrCharCount = alphaNumCount
            )
          }
        } catch (e: Exception) {
          Log.w("FocusLiveCameraView", "Emit frame result skipped: \${e.message}")
        } finally {
          try {
            if (!cropped.isRecycled) cropped.recycle()
          } catch (_: Exception) {
          }
          isProcessing.set(false)
          try {
            imageProxy.close()
          } catch (_: Exception) {
          }
        }
      }
    } catch (e: Exception) {
      Log.w("FocusLiveCameraView", "Frame analysis error: \${e.message}")
      try {
        roiBitmap?.recycle()
      } catch (_: Exception) {
      }
      isProcessing.set(false)
      try {
        imageProxy.close()
      } catch (_: Exception) {
      }
    }
  }

  private fun emitFrameResult(
    target: String,
    labels: List<ImageLabel>,
    ocrText: String,
    ocrWordCount: Int,
    ocrCharCount: Int
  ) {
    val payload = Arguments.createMap().apply {
      putString("targetItem", target)
      val arr = Arguments.createArray()
      for (lbl in labels) {
        val itemMap = Arguments.createMap()
        itemMap.putString("text", lbl.text)
        itemMap.putDouble("confidence", lbl.confidence.toDouble())
        arr.pushMap(itemMap)
      }
      putArray("labels", arr)
      putString("ocrText", ocrText)
      putInt("ocrWordCount", ocrWordCount)
      putInt("ocrCharCount", ocrCharCount)
      putDouble("timestampMs", System.currentTimeMillis().toDouble())
    }

    mainHandler.post {
      if (isDisposed) return@post
      try {
        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("FocusLiveVisionFrame", payload)
      } catch (_: Exception) {
      }
    }
  }

  private fun emitStatus(ready: Boolean, error: String?) {
    val payload = Arguments.createMap().apply {
      putBoolean("ready", ready)
      if (error != null) putString("error", error)
    }
    mainHandler.post {
      if (isDisposed) return@post
      try {
        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("FocusLiveCameraStatus", payload)
      } catch (_: Exception) {
      }
    }
  }

  fun dispose() {
    if (isDisposed) return
    isDisposed = true
    isActive = false
    mainHandler.removeCallbacksAndMessages(null)
    try {
      cameraProvider?.unbindAll()
    } catch (_: Exception) {
    }
    cameraProvider = null
    try {
      imageLabeler?.close()
    } catch (_: Exception) {
    }
    imageLabeler = null
    try {
      textRecognizer?.close()
    } catch (_: Exception) {
    }
    textRecognizer = null
    try {
      analysisExecutor?.shutdownNow()
    } catch (_: Exception) {
    }
    analysisExecutor = null
    isProcessing.set(false)
  }
}

class FocusLiveCameraViewManager : SimpleViewManager<FocusLiveCameraView>() {
  override fun getName(): String = "FocusLiveCameraView"

  override fun createViewInstance(reactContext: ThemedReactContext): FocusLiveCameraView =
    FocusLiveCameraView(reactContext)

  @ReactProp(name = "facing")
  fun setFacing(view: FocusLiveCameraView, facing: String?) {
    view.setFacing(facing)
  }

  @ReactProp(name = "active", defaultBoolean = true)
  fun setActive(view: FocusLiveCameraView, active: Boolean) {
    view.setActive(active)
  }

  @ReactProp(name = "targetItem")
  fun setTargetItem(view: FocusLiveCameraView, targetItem: String?) {
    view.setTargetItem(targetItem)
  }

  override fun onDropViewInstance(view: FocusLiveCameraView) {
    super.onDropViewInstance(view)
    view.dispose()
  }
}
`;
}

function buildKotlinNativeModulesSource(packageName) {
  return `package ${packageName}

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import java.io.File

/**
 * Native Android OS permission bridge (Display Over Apps, Exact Alarms, Full-Screen Intents).
 */
class FocusOverlayPermissionModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "FocusOverlayPermission"

  @ReactMethod
  fun canDrawOverlays(promise: Promise) {
    try {
      val allowed =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(reactContext)
      promise.resolve(allowed)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        promise.resolve(true)
        return
      }
      val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      promise.resolve(alarmManager?.canScheduleExactAlarms() == true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun canUseFullScreenIntent(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        promise.resolve(true)
        return
      }
      val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      promise.resolve(nm?.canUseFullScreenIntent() == true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun openOverlaySettings(promise: Promise) {
    try {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:\${reactContext.packageName}")
        )
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:\${reactContext.packageName}")
        }
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("OPEN_OVERLAY_SETTINGS_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    try {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Intent(
          Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
          Uri.parse("package:\${reactContext.packageName}")
        )
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:\${reactContext.packageName}")
        }
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("OPEN_EXACT_ALARM_SETTINGS_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun openFullScreenIntentSettings(promise: Promise) {
    try {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        Intent(
          Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
          Uri.parse("package:\${reactContext.packageName}")
        )
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:\${reactContext.packageName}")
        }
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("OPEN_FULL_SCREEN_SETTINGS_FAILED", e.message, e)
    }
  }
}

/**
 * Fallback single-shot offline Google ML Kit Image Labeling bridge with center ROI crop.
 * Immediately deletes temp photo after inference for privacy (imagePath: null).
 */
class FocusVisionModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "FocusVision"

  @ReactMethod
  fun labelImage(imageUri: String, promise: Promise) {
    val parsedUri = Uri.parse(imageUri)
    val tempFile = if (parsedUri.scheme == "file") {
      parsedUri.path?.let { File(it) }
    } else if (imageUri.startsWith("/")) {
      File(imageUri)
    } else {
      null
    }

    fun cleanup() {
      try {
        if (tempFile != null && tempFile.exists()) {
          tempFile.delete()
        }
      } catch (_: Exception) {
      }
    }

    var roiBitmap: Bitmap? = null
    try {
      val filePath = tempFile?.absolutePath ?: imageUri
      val decoded = BitmapFactory.decodeFile(filePath)
      val inputImage = if (decoded != null) {
        val cropW = (decoded.width * 0.68f).toInt().coerceAtLeast(64).coerceAtMost(decoded.width)
        val cropH = (decoded.height * 0.64f).toInt().coerceAtLeast(64).coerceAtMost(decoded.height)
        val left = ((decoded.width - cropW) / 2).coerceAtLeast(0)
        val top = ((decoded.height - cropH) / 2).coerceAtLeast(0)
        val cropped = Bitmap.createBitmap(decoded, left, top, cropW, cropH)
        roiBitmap = cropped
        if (cropped !== decoded) decoded.recycle()
        InputImage.fromBitmap(cropped, 0)
      } else {
        InputImage.fromFilePath(
          reactContext,
          if (parsedUri.scheme != null) parsedUri else Uri.fromFile(File(imageUri))
        )
      }

      val options = ImageLabelerOptions.Builder()
        .setConfidenceThreshold(0.42f)
        .build()
      val labeler = ImageLabeling.getClient(options)

      labeler.process(inputImage)
        .addOnSuccessListener { labels ->
          val arr = Arguments.createArray()
          for (label in labels) {
            val map = Arguments.createMap()
            map.putString("text", label.text)
            map.putDouble("confidence", label.confidence.toDouble())
            arr.pushMap(map)
          }
          try { roiBitmap?.recycle() } catch (_: Exception) {}
          cleanup()
          labeler.close()
          promise.resolve(arr)
        }
        .addOnFailureListener { e ->
          try { roiBitmap?.recycle() } catch (_: Exception) {}
          cleanup()
          labeler.close()
          promise.reject("MLKIT_LABEL_FAILED", e.message, e)
        }
    } catch (e: Exception) {
      try { roiBitmap?.recycle() } catch (_: Exception) {}
      cleanup()
      promise.reject("MLKIT_INPUT_FAILED", e.message, e)
    }
  }
}

/**
 * Native Android Alarm Audio + Vibration loop played on USAGE_ALARM while the AI Camera Gate
 * prompts the user to hover over their required work item.
 */
class FocusAlarmAudioModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    private var mediaPlayer: MediaPlayer? = null
  }

  override fun getName(): String = "FocusAlarmAudio"

  @ReactMethod
  fun startAlarm(promise: Promise) {
    try {
      stopInternal()
      val alarmUri =
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
          ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
          ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

      if (alarmUri != null) {
        val mp = MediaPlayer()
        mp.setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        mp.setDataSource(reactContext, alarmUri)
        mp.isLooping = true
        mp.prepare()
        mp.start()
        mediaPlayer = mp
      }

      val pattern = longArrayOf(0L, 450L, 350L, 450L, 600L)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vm = reactContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        vm?.defaultVibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
      } else {
        @Suppress("DEPRECATION")
        val vib = reactContext.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          vib?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
          @Suppress("DEPRECATION")
          vib?.vibrate(pattern, 0)
        }
      }

      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun stopAlarm(promise: Promise) {
    stopInternal()
    promise.resolve(true)
  }

  private fun stopInternal() {
    try {
      mediaPlayer?.apply {
        if (isPlaying) stop()
        release()
      }
    } catch (_: Exception) {
    } finally {
      mediaPlayer = null
    }

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vm = reactContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        vm?.defaultVibrator?.cancel()
      } else {
        @Suppress("DEPRECATION")
        val vib = reactContext.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        vib?.cancel()
      }
    } catch (_: Exception) {
    }
  }
}

/**
 * Native bridge controlling FocusSessionForegroundService (live background countdown +
 * onTaskRemoved swipe-kill recovery with Past Due Date Cutoff).
 */
class FocusSessionServiceModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "FocusSessionService"

  @ReactMethod
  fun startTracking(
    sessionId: String,
    taskId: String,
    taskTitle: String,
    endTimestampMs: Double,
    plannedSeconds: Int,
    deadlineMs: Double,
    promise: Promise
  ) {
    try {
      val intent = Intent(reactContext, FocusSessionForegroundService::class.java).apply {
        action = FocusSessionForegroundService.ACTION_START
        putExtra(FocusSessionForegroundService.EXTRA_SESSION_ID, sessionId)
        putExtra(FocusSessionForegroundService.EXTRA_TASK_ID, taskId)
        putExtra(FocusSessionForegroundService.EXTRA_TASK_TITLE, taskTitle)
        putExtra(FocusSessionForegroundService.EXTRA_END_MS, endTimestampMs.toLong())
        putExtra(FocusSessionForegroundService.EXTRA_PLANNED_SECONDS, plannedSeconds)
        putExtra(FocusSessionForegroundService.EXTRA_DEADLINE_MS, deadlineMs.toLong())
      }
      ContextCompat.startForegroundService(reactContext, intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun pauseTracking(remainingSeconds: Int, promise: Promise) {
    try {
      val intent = Intent(reactContext, FocusSessionForegroundService::class.java).apply {
        action = FocusSessionForegroundService.ACTION_PAUSE
        putExtra(FocusSessionForegroundService.EXTRA_REMAINING_SECONDS, remainingSeconds)
      }
      reactContext.startService(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun stopTracking(promise: Promise) {
    try {
      val intent = Intent(reactContext, FocusSessionForegroundService::class.java).apply {
        action = FocusSessionForegroundService.ACTION_STOP
      }
      reactContext.startService(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun consumePendingSwipeKillEvent(promise: Promise) {
    try {
      val prefs = reactContext.getSharedPreferences(
        FocusSessionForegroundService.PREFS_NAME,
        Context.MODE_PRIVATE
      )
      if (!prefs.getBoolean("pending", false)) {
        promise.resolve(null)
        return
      }
      val map = Arguments.createMap().apply {
        putString("sessionId", prefs.getString("sessionId", "") ?: "")
        putString("taskId", prefs.getString("taskId", "") ?: "")
        putString("taskTitle", prefs.getString("taskTitle", "") ?: "")
        putDouble("terminatedAtMs", prefs.getLong("terminatedAtMs", 0L).toDouble())
        putDouble("rescheduledAtMs", prefs.getLong("rescheduledAtMs", 0L).toDouble())
        putBoolean("pastDue", prefs.getBoolean("pastDue", false))
      }
      prefs.edit().clear().apply()
      // Cancel backup native swipe-kill alarms so JS notification sync takes over without duplicates
      try {
        val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        val flags =
          PendingIntent.FLAG_NO_CREATE or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        for (reqCode in intArrayOf(9101, 9102)) {
          val i = Intent(reactContext, SwipeKillAlarmReceiver::class.java)
          val pi = PendingIntent.getBroadcast(reactContext, reqCode, i, flags)
          if (pi != null) {
            alarmManager?.cancel(pi)
            pi.cancel()
          }
        }
      } catch (_: Exception) {
      }
      promise.resolve(map)
    } catch (e: Exception) {
      promise.resolve(null)
    }
  }
}

class FocusOverlayPermissionPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(
      FocusOverlayPermissionModule(reactContext),
      FocusVisionModule(reactContext),
      FocusAlarmAudioModule(reactContext),
      FocusSessionServiceModule(reactContext)
    )

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    listOf(FocusLiveCameraViewManager())
}
`;
}

function ensurePermission(manifest, permissionName) {
  if (!Array.isArray(manifest['uses-permission'])) {
    manifest['uses-permission'] = [];
  }
  const exists = manifest['uses-permission'].some(
    (entry) => entry?.$?.['android:name'] === permissionName,
  );
  if (!exists) {
    manifest['uses-permission'].push({
      $: { 'android:name': permissionName },
    });
  }
}

module.exports = function withFocusAlarm(config) {
  // 1. Add bundled offline Google ML Kit Image Labeling + Text Recognition (OCR) + CameraX 1.6.0
  // Note: Do NOT force listenablefuture:1.0 in :app — React Native / Guava 33.3.1 already bundles
  // com.google.common.util.concurrent.ListenableFuture and uses the 9999.0-empty stub automatically.
  config = withAppBuildGradle(config, (modConfig) => {
    const withDeps = mergeContents({
      src: modConfig.modResults.contents,
      tag: 'procrastistop-mlkit-vision',
      comment: '    //',
      anchor: /dependencies\s*\{/,
      offset: 1,
      newSrc: [
        '    implementation("com.google.mlkit:image-labeling:17.0.9")',
        '    implementation("com.google.mlkit:text-recognition:16.0.1")',
        '    implementation("androidx.camera:camera-core:1.6.0")',
        '    implementation("androidx.camera:camera-camera2:1.6.0")',
        '    implementation("androidx.camera:camera-lifecycle:1.6.0")',
        '    implementation("androidx.camera:camera-view:1.6.0")',
      ].join('\n'),
    });

    modConfig.modResults.contents = withDeps.contents;
    return modConfig;
  });

  // 2. AndroidManifest permissions, MainActivity flags, foreground service & alarm receivers
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    for (const permission of REQUIRED_ANDROID_PERMISSIONS) {
      ensurePermission(manifest, permission);
    }

    const application = manifest.application?.[0];
    if (application) {
      const activities = application.activity || [];
      const mainActivity = activities.find(
        (act) =>
          act?.$?.['android:name'] === '.MainActivity' ||
          act?.$?.['android:name']?.endsWith('.MainActivity'),
      );
      if (mainActivity && mainActivity.$) {
        mainActivity.$['android:showWhenLocked'] = 'true';
        mainActivity.$['android:turnScreenOn'] = 'true';
      }

      if (!Array.isArray(application.receiver)) {
        application.receiver = [];
      }

      if (!application.receiver.some((rec) => rec?.$?.['android:name'] === RECEIVER_NAME)) {
        application.receiver.push({
          $: {
            'android:name': RECEIVER_NAME,
            'android:enabled': 'true',
            'android:exported': 'false',
          },
          'intent-filter': [
            {
              $: { 'android:priority': '100' },
              action: [
                { $: { 'android:name': 'expo.modules.notifications.NOTIFICATION_EVENT' } },
                { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
                { $: { 'android:name': 'android.intent.action.REBOOT' } },
                { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
                { $: { 'android:name': 'com.htc.intent.action.QUICKBOOT_POWERON' } },
                { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
              ],
            },
          ],
        });
      }

      if (
        !application.receiver.some((rec) => rec?.$?.['android:name'] === SWIPE_KILL_RECEIVER_NAME)
      ) {
        application.receiver.push({
          $: {
            'android:name': SWIPE_KILL_RECEIVER_NAME,
            'android:enabled': 'true',
            'android:exported': 'false',
          },
        });
      }

      if (!Array.isArray(application.service)) {
        application.service = [];
      }

      if (
        !application.service.some((svc) => svc?.$?.['android:name'] === FOREGROUND_SERVICE_NAME)
      ) {
        application.service.push({
          $: {
            'android:name': FOREGROUND_SERVICE_NAME,
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:foregroundServiceType': 'specialUse',
            'android:stopWithTask': 'false',
          },
          property: [
            {
              $: {
                'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
                'android:value': 'focus_session_countdown',
              },
            },
          ],
        });
      }
    }

    return modConfig;
  });

  // 3. MainActivity runtime window flags (setShowWhenLocked, setTurnScreenOn, dismiss keyguard)
  config = withMainActivity(config, (modConfig) => {
    const { language } = modConfig.modResults;
    if (language === 'kt') {
      const withImports = addImports(
        modConfig.modResults.contents,
        [
          'android.app.KeyguardManager',
          'android.content.Context',
          'android.os.Build',
          'android.view.WindowManager',
        ],
        false,
      );

      const merged = mergeContents({
        src: withImports,
        tag: 'procrastistop-lockscreen-flags',
        comment: '    //',
        anchor: /super\.onCreate\(null\)/,
        offset: 1,
        newSrc: [
          '    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {',
          '      setShowWhenLocked(true)',
          '      setTurnScreenOn(true)',
          '      val km = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager',
          '      if (intent?.data?.getQueryParameter("alarm") == "1" || intent?.data?.getQueryParameter("autoStart") == "1") {',
          '        km?.requestDismissKeyguard(this, null)',
          '      }',
          '    } else {',
          '      @Suppress("DEPRECATION")',
          '      window.addFlags(',
          '        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or',
          '          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON',
          '      )',
          '    }',
        ].join('\n'),
      });

      modConfig.modResults.contents = merged.contents;
    }
    return modConfig;
  });

  // 4. Register FocusOverlayPermissionPackage in MainApplication.kt
  config = withMainApplication(config, (modConfig) => {
    if (modConfig.modResults.language === 'kt') {
      const merged = mergeContents({
        src: modConfig.modResults.contents,
        tag: 'procrastistop-overlay-package',
        comment: '          //',
        anchor: /PackageList\(this\)\.packages\.apply\s*\{/,
        offset: 1,
        newSrc: '          add(FocusOverlayPermissionPackage())',
      });
      modConfig.modResults.contents = merged.contents;
    }
    return modConfig;
  });

  // 5. Write native Kotlin files into android/app/src/main/java/<package>/
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const packageName = modConfig.android?.package || 'com.procrastistop.app';
      const rawScheme = modConfig.scheme;
      const scheme = Array.isArray(rawScheme) ? rawScheme[0] : rawScheme || 'procrastistop';

      const packagePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...packageName.split('.'),
      );
      fs.mkdirSync(packagePath, { recursive: true });

      fs.writeFileSync(
        path.join(packagePath, 'FocusAlarmNotificationsService.kt'),
        buildKotlinServiceSource(packageName, scheme),
        'utf8',
      );

      fs.writeFileSync(
        path.join(packagePath, 'FocusSessionForegroundService.kt'),
        buildKotlinForegroundServiceSource(packageName, scheme),
        'utf8',
      );

      fs.writeFileSync(
        path.join(packagePath, 'SwipeKillAlarmReceiver.kt'),
        buildKotlinSwipeKillReceiverSource(packageName, scheme),
        'utf8',
      );

      fs.writeFileSync(
        path.join(packagePath, 'FocusLiveCameraView.kt'),
        buildKotlinLiveCameraSource(packageName),
        'utf8',
      );

      fs.writeFileSync(
        path.join(packagePath, 'FocusOverlayPermissionModule.kt'),
        buildKotlinNativeModulesSource(packageName),
        'utf8',
      );

      return modConfig;
    },
  ]);

  return config;
};
