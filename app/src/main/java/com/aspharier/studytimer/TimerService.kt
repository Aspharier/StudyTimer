package com.aspharier.studytimer

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.aspharier.studytimer.data.repository.StudySessionRepository
import com.aspharier.studytimer.di.StudyTimerApp
import com.aspharier.studytimer.domain.model.StudySession
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@AndroidEntryPoint
class TimerService : Service() {

    @Inject
    lateinit var repository: StudySessionRepository

    private val binder = TimerBinder()
    private var timerJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Default)

    private val _timerState = MutableStateFlow(TimerState())
    val timerState: StateFlow<TimerState> = _timerState.asStateFlow()

    private val _onTimerFinished = MutableStateFlow(false)
    val onTimerFinished: StateFlow<Boolean> = _onTimerFinished.asStateFlow()

    inner class TimerBinder : Binder() {
        fun getService(): TimerService = this@TimerService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val sessionId = intent.getLongExtra(EXTRA_SESSION_ID, 0L)
                val label = intent.getStringExtra(EXTRA_LABEL) ?: "Study"
                val durationMinutes = intent.getIntExtra(EXTRA_DURATION, 25)
                startTimer(sessionId, label, durationMinutes)
            }
            ACTION_PAUSE -> pauseTimer()
            ACTION_RESUME -> resumeTimer()
            ACTION_STOP -> stopTimer()
        }
        return START_STICKY
    }

    private fun startTimer(sessionId: Long, label: String, durationMinutes: Int) {
        val totalSeconds = durationMinutes * 60L
        _timerState.value = TimerState(
            sessionId = sessionId,
            label = label,
            totalSeconds = totalSeconds,
            remainingSeconds = totalSeconds,
            isRunning = true,
            isPaused = false,
            startedAtMillis = System.currentTimeMillis(),
            date = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        )
        _onTimerFinished.value = false
        persistTimerState(isCompleted = false, endTime = null)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                createNotification(label, formatTime(totalSeconds)),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIFICATION_ID, createNotification(label, formatTime(totalSeconds)))
        }
        startCountdown()
    }

    private fun startCountdown() {
        timerJob?.cancel()
        timerJob = scope.launch {
            while (_timerState.value.remainingSeconds > 0 && _timerState.value.isRunning) {
                if (!_timerState.value.isPaused) {
                    delay(1000)
                    _timerState.value = _timerState.value.copy(
                        remainingSeconds = _timerState.value.remainingSeconds - 1
                    )
                    persistTimerState(isCompleted = false, endTime = null)
                    updateNotification(
                        _timerState.value.label,
                        formatTime(_timerState.value.remainingSeconds)
                    )
                } else {
                    delay(100)
                }
            }
            if (_timerState.value.remainingSeconds <= 0) {
                onTimerComplete()
            }
        }
    }

    private fun pauseTimer() {
        _timerState.value = _timerState.value.copy(isPaused = true)
        persistTimerState(isCompleted = false, endTime = null)
        updateNotification(_timerState.value.label, formatTime(_timerState.value.remainingSeconds) + " (Paused)")
    }

    private fun resumeTimer() {
        _timerState.value = _timerState.value.copy(isPaused = false)
        persistTimerState(isCompleted = false, endTime = null)
    }

    private fun stopTimer() {
        persistTimerState(isCompleted = false, endTime = System.currentTimeMillis())
        timerJob?.cancel()
        _timerState.value = TimerState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun onTimerComplete() {
        timerJob?.cancel()
        _timerState.value = _timerState.value.copy(
            isRunning = false,
            isCompleted = true
        )
        persistTimerState(isCompleted = true, endTime = System.currentTimeMillis())
        _onTimerFinished.value = true
        showFinishedNotification()
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    fun getCompletedSeconds(): Long {
        return _timerState.value.totalSeconds - _timerState.value.remainingSeconds
    }

    private fun createNotification(label: String, time: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, StudyTimerApp.TIMER_CHANNEL_ID)
            .setContentTitle(label)
            .setContentText(time)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun updateNotification(label: String, time: String) {
        val notification = createNotification(label, time)
        val notificationManager = getSystemService(android.app.NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun showFinishedNotification() {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, StudyTimerApp.FINISHED_CHANNEL_ID)
            .setContentTitle("Timer Finished!")
            .setContentText("${_timerState.value.label} session is complete")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        val notificationManager = getSystemService(android.app.NotificationManager::class.java)
        notificationManager.notify(FINISHED_NOTIFICATION_ID, notification)
    }

    private fun formatTime(seconds: Long): String {
        val mins = seconds / 60
        val secs = seconds % 60
        return String.format("%02d:%02d", mins, secs)
    }

    private fun persistTimerState(isCompleted: Boolean, endTime: Long?) {
        val state = _timerState.value
        if (state.sessionId == 0L || state.totalSeconds == 0L) return

        scope.launch(Dispatchers.IO) {
            repository.updateSession(
                StudySession(
                    id = state.sessionId,
                    label = state.label,
                    durationMinutes = (state.totalSeconds / 60).toInt(),
                    completedDurationSeconds = state.totalSeconds - state.remainingSeconds,
                    date = state.date,
                    startTime = state.startedAtMillis,
                    endTime = endTime,
                    isCompleted = isCompleted
                )
            )
        }
    }

    override fun onDestroy() {
        timerJob?.cancel()
        super.onDestroy()
    }

    companion object {
        const val ACTION_START = "com.aspharier.studytimer.ACTION_START"
        const val ACTION_PAUSE = "com.aspharier.studytimer.ACTION_PAUSE"
        const val ACTION_RESUME = "com.aspharier.studytimer.ACTION_RESUME"
        const val ACTION_STOP = "com.aspharier.studytimer.ACTION_STOP"

        const val EXTRA_LABEL = "extra_label"
        const val EXTRA_DURATION = "extra_duration"
        const val EXTRA_SESSION_ID = "extra_session_id"

        private const val NOTIFICATION_ID = 1
        private const val FINISHED_NOTIFICATION_ID = 2
    }
}

data class TimerState(
    val sessionId: Long = 0,
    val label: String = "",
    val totalSeconds: Long = 0,
    val remainingSeconds: Long = 0,
    val isRunning: Boolean = false,
    val isPaused: Boolean = false,
    val isCompleted: Boolean = false,
    val startedAtMillis: Long = 0,
    val date: String = ""
)
