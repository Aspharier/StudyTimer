package com.aspharier.studytimer.domain.model

enum class ChallengeIcon {
    CONSISTENCY,
    TIME_STRETCH,
    PERSONAL_BEST
}

data class WeeklyChallenge(
    val id: String,
    val title: String,
    val description: String,
    val targetValue: Long,
    val currentValue: Long,
    val isCompleted: Boolean,
    val progressPercent: Float,
    val icon: ChallengeIcon
)
