package com.aspharier.studytimer.domain.model

data class StudySession(
    val id: Long = 0,
    val label: String,
    val durationMinutes: Int,
    val completedDurationSeconds: Long,
    val date: String,
    val startTime: Long,
    val endTime: Long? = null,
    val isCompleted: Boolean = false
)

data class DailySessions(
    val date: String,
    val sessions: List<StudySession>,
    val totalMinutes: Int
)