package com.aspharier.studytimer.ui.screens.timer

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.aspharier.studytimer.data.repository.StudySessionRepository
import com.aspharier.studytimer.domain.model.StudySession
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TimerUiState(
    val session: StudySession? = null
)

@HiltViewModel
class TimerViewModel @Inject constructor(
    application: Application,
    private val repository: StudySessionRepository
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(TimerUiState())
    val uiState: StateFlow<TimerUiState> = _uiState.asStateFlow()

    fun loadSession(sessionId: Long) {
        viewModelScope.launch {
            val session = repository.getSessionById(sessionId)
            _uiState.value = TimerUiState(session = session)
        }
    }
}