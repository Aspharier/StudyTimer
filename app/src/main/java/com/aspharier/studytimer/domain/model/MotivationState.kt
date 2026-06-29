package com.aspharier.studytimer.domain.model

enum class MomentumLevel {
    SURGING,          // > +20%
    RISING,           // +5% to +20%
    STEADY,           // -5% to +5%
    SLIPPING,         // -5% to -20%
    FALLING,          // < -20%
    BUILDING_BASELINE // first week / no data
}

data class Momentum(
    val level: MomentumLevel,
    val changePercent: Float,
    val thisWeekHours: Float,
    val lastWeekHours: Float
)

data class MotivationState(
    val adaptiveTargetMinutes: Int,
    val isAdaptiveAboveBase: Boolean,
    val momentum: Momentum,
    val challenges: List<WeeklyChallenge>
)
