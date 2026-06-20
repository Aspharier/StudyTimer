package com.aspharier.studytimer.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aspharier.studytimer.data.repository.StudySessionRepository
import com.aspharier.studytimer.data.repository.SyllabusRepository
import com.aspharier.studytimer.data.sync.SyncManager
import com.aspharier.studytimer.domain.model.StudySession
import com.aspharier.studytimer.domain.model.Subject
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    repository: StudySessionRepository,
    syllabusRepository: SyllabusRepository,
    private val auth: FirebaseAuth,
    private val syncManager: SyncManager,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val preferences = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    val sessions: StateFlow<List<StudySession>> = repository.getAllSessions()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList()
        )

    val subjects: StateFlow<List<Subject>> = syllabusRepository.getAllSubjects()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList()
        )

    val currentUser: StateFlow<FirebaseUser?> = kotlinx.coroutines.flow.callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            trySend(firebaseAuth.currentUser)
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = auth.currentUser
    )

    val syncStatus = MutableStateFlow<String?>(null)
    
    private val _lastSyncTime = MutableStateFlow<String?>(preferences.getString("last_sync_time", null))
    val lastSyncTime: StateFlow<String?> = _lastSyncTime

    fun syncData() {
        val user = currentUser.value ?: return
        viewModelScope.launch {
            syncStatus.value = "Syncing..."
            syncManager.sync().fold(
                onSuccess = {
                    val currentTime = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                    preferences.edit().putString("last_sync_time", currentTime).apply()
                    _lastSyncTime.value = currentTime
                    syncStatus.value = "Synced successfully!"
                },
                onFailure = {
                    syncStatus.value = "Sync failed: ${it.localizedMessage}"
                }
            )
        }
    }

    fun logout() {
        auth.signOut()
        syncStatus.value = null
    }

    fun signInWithGoogleToken(idToken: String) {
        viewModelScope.launch {
            syncStatus.value = "Connecting..."
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            try {
                auth.signInWithCredential(credential).await()
                syncData()
            } catch (e: Exception) {
                syncStatus.value = "Login failed: ${e.localizedMessage}"
            }
        }
    }
}


