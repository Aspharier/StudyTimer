package com.aspharier.studytimer.domain.model

data class ExamGoal(
    val id: Long = 0,
    val name: String,
    val examDate: String, // ISO date "yyyy-MM-dd"
    val dailyTargetMinutes: Int = 360,
    val createdAt: Long = System.currentTimeMillis(),
    val isActive: Boolean = true
)
