package com.aspharier.studytimer.ui.screens.history

import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.aspharier.studytimer.TimerService
import com.aspharier.studytimer.data.repository.StudySessionRepository
import com.aspharier.studytimer.domain.model.DailySessions
import com.aspharier.studytimer.domain.model.StudySession
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class HistoryUiState(
    val todaySessions: DailySessions? = null,
    val allDates: List<String> = emptyList(),
    val allSessions: List<StudySession> = emptyList()
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    application: Application,
    private val repository: StudySessionRepository
) : AndroidViewModel(application) {

    private val context: Context = application.applicationContext

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    private val _showFinishedDialog = MutableStateFlow(false)
    val showFinishedDialog: StateFlow<Boolean> = _showFinishedDialog.asStateFlow()

    private var timerService: TimerService? = null

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as TimerService.TimerBinder
            timerService = binder.getService()
            observeTimerState()
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            timerService = null
        }
    }

    init {
        loadTodaySessions()
        bindTimerService()
    }

    private fun loadTodaySessions() {
        viewModelScope.launch {
            val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
            combine(
                repository.getDailySessions(today),
                repository.getAllDates(),
                repository.getAllSessions()
            ) { daily, dates, sessions ->
                HistoryUiState(
                    todaySessions = daily,
                    allDates = dates,
                    allSessions = sessions
                )
            }.collect { state ->
                _uiState.value = state
            }
        }
    }

    private fun bindTimerService() {
        Intent(context, TimerService::class.java).also { intent ->
            context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
        }
    }

    private fun observeTimerState() {
        viewModelScope.launch {
            timerService?.timerState?.collect { state ->
                if (state.isCompleted && !state.isRunning) {
                    _showFinishedDialog.value = true
                }
            }
        }
    }

    fun dismissFinishedDialog() {
        _showFinishedDialog.value = false
    }

    fun createSession(label: String, durationMinutes: Int, onSessionCreated: (Long) -> Unit) {
        viewModelScope.launch {
            val session = StudySession(
                label = label,
                durationMinutes = durationMinutes,
                completedDurationSeconds = 0,
                date = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE),
                startTime = System.currentTimeMillis()
            )
            val sessionId = repository.insertSession(session)

            startTimerService(sessionId, label, durationMinutes)
            onSessionCreated(sessionId)
        }
    }

    fun deleteSession(sessionId: Long) {
        viewModelScope.launch {
            if (timerService?.timerState?.value?.sessionId == sessionId) {
                val intent = Intent(context, TimerService::class.java).apply {
                    action = TimerService.ACTION_STOP
                }
                context.startService(intent)
            }
            repository.deleteSession(sessionId)
        }
    }

    private fun startTimerService(sessionId: Long, label: String, durationMinutes: Int) {
        val intent = Intent(context, TimerService::class.java).apply {
            action = TimerService.ACTION_START
            putExtra(TimerService.EXTRA_SESSION_ID, sessionId)
            putExtra(TimerService.EXTRA_LABEL, label)
            putExtra(TimerService.EXTRA_DURATION, durationMinutes)
        }
        ContextCompat.startForegroundService(context, intent)
    }

    override fun onCleared() {
        super.onCleared()
        try {
            context.unbindService(connection)
        } catch (e: Exception) {
        }
    }
}
