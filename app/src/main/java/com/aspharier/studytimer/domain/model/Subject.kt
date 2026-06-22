package com.aspharier.studytimer.domain.model

data class Subject(
    val id: Long = 0,
    val name: String,
    val examGoalId: Long,
    val colorHex: String = "#4D96FF",
    val sortOrder: Int = 0,
    val totalTopics: Int = 0,
    val completedTopics: Int = 0,
    val targetHours: Int? = null,
    val priority: String = "MEDIUM"
) {
    val completionPercentage: Float
        get() = if (totalTopics > 0) completedTopics.toFloat() / totalTopics else 0f
}
