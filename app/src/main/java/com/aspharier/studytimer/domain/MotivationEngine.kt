package com.aspharier.studytimer.domain

import android.content.Context
import com.aspharier.studytimer.domain.model.ChallengeIcon
import com.aspharier.studytimer.domain.model.Momentum
import com.aspharier.studytimer.domain.model.MomentumLevel
import com.aspharier.studytimer.domain.model.MotivationState
import com.aspharier.studytimer.domain.model.WeeklyChallenge
import com.aspharier.studytimer.domain.model.StudySession
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale
import kotlin.math.max
import kotlin.math.roundToInt

object MotivationEngine {

    private const val PREFS_NAME = "motivation_prefs"

    fun getWeekKey(date: LocalDate): String {
        val weekFields = WeekFields.of(Locale.getDefault())
        val weekNumber = date.get(weekFields.weekOfWeekBasedYear())
        val year = date.get(weekFields.weekBasedYear())
        return "${year}_W$weekNumber"
    }

    fun calculateMotivationState(
        context: Context,
        userSetTargetMinutes: Int,
        thisWeekSessions: List<StudySession>,
        lastWeekSessions: List<StudySession>,
        personalBestDailySeconds: Long
    ): MotivationState {
        val today = LocalDate.now()
        val weekKey = getWeekKey(today)
        
        // 1. Calculate Adaptive Daily Target (Last 7 calendar days rolling average + 15% stretch)
        val last7DaysLimit = today.minusDays(6)
        val formatter = DateTimeFormatter.ISO_LOCAL_DATE
        val last7DaysSessions = (thisWeekSessions + lastWeekSessions).filter {
            try {
                val sessionDate = LocalDate.parse(it.date, formatter)
                !sessionDate.isBefore(last7DaysLimit) && !sessionDate.isAfter(today)
            } catch (_: Exception) {
                false
            }
        }
        val last7DaysTotalSeconds = last7DaysSessions.sumOf { it.completedDurationSeconds }
        val rollingAverageMinutes = (last7DaysTotalSeconds / 7.0 / 60.0).roundToInt()
        
        val stretchTargetMinutes = (rollingAverageMinutes * 1.15).roundToInt()
        val adaptiveTargetMinutes = max(userSetTargetMinutes, stretchTargetMinutes).coerceAtMost(720)
        val isAdaptiveAboveBase = adaptiveTargetMinutes > userSetTargetMinutes

        // 2. Calculate Momentum
        val thisWeekTotalSeconds = thisWeekSessions.sumOf { it.completedDurationSeconds }
        val lastWeekTotalSeconds = lastWeekSessions.sumOf { it.completedDurationSeconds }
        
        val thisWeekHours = thisWeekTotalSeconds / 3600f
        val lastWeekHours = lastWeekTotalSeconds / 3600f
        
        val momentum = if (lastWeekTotalSeconds <= 0) {
            Momentum(
                level = MomentumLevel.BUILDING_BASELINE,
                changePercent = 0f,
                thisWeekHours = thisWeekHours,
                lastWeekHours = lastWeekHours
            )
        } else {
            val changePercent = ((thisWeekTotalSeconds - lastWeekTotalSeconds).toFloat() / lastWeekTotalSeconds) * 100f
            val level = when {
                changePercent > 20f -> MomentumLevel.SURGING
                changePercent in 5f..20f -> MomentumLevel.RISING
                changePercent in -5f..5f -> MomentumLevel.STEADY
                changePercent in -20f..-5f -> MomentumLevel.SLIPPING
                else -> MomentumLevel.FALLING
            }
            Momentum(
                level = level,
                changePercent = changePercent,
                thisWeekHours = thisWeekHours,
                lastWeekHours = lastWeekHours
            )
        }

        // 3. Generate & Evaluate Weekly Challenges
        val sharedPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val initializedKey = "initialized_$weekKey"
        
        val consistencyTargetKey = "challenge_consistency_target_$weekKey"
        val timeStretchTargetKey = "challenge_time_stretch_target_$weekKey"
        val personalBestTargetKey = "challenge_personal_best_target_$weekKey"
        
        if (!sharedPrefs.getBoolean(initializedKey, false)) {
            // Generate targets deterministically for the week
            val activeDaysLastWeek = lastWeekSessions.map { it.date }.distinct().size
            val consistencyTarget = if (activeDaysLastWeek >= 4) 5L else 4L
            
            val timeStretchTargetSeconds = max((lastWeekTotalSeconds * 1.1).toLong(), 10 * 3600L)
            
            val personalBestTarget = max(personalBestDailySeconds, 4 * 3600L)
            
            sharedPrefs.edit()
                .putLong(consistencyTargetKey, consistencyTarget)
                .putLong(timeStretchTargetKey, timeStretchTargetSeconds)
                .putLong(personalBestTargetKey, personalBestTarget)
                .putBoolean(initializedKey, true)
                .apply()
        }
        
        val consistencyTarget = sharedPrefs.getLong(consistencyTargetKey, 4L)
        val timeStretchTargetSeconds = sharedPrefs.getLong(timeStretchTargetKey, 10 * 3600L)
        val personalBestTargetSeconds = sharedPrefs.getLong(personalBestTargetKey, 4 * 3600L)
        
        val consistencyCurrent = thisWeekSessions.filter { it.completedDurationSeconds > 0 }.map { it.date }.distinct().size.toLong()
        val timeStretchCurrent = thisWeekTotalSeconds
        val dailyTotalsThisWeek = thisWeekSessions.groupBy { it.date }
            .mapValues { entry -> entry.value.sumOf { it.completedDurationSeconds } }
        val personalBestCurrent = dailyTotalsThisWeek.values.maxOrNull() ?: 0L

        val challenges = listOf(
            WeeklyChallenge(
                id = "consistency_$weekKey",
                title = "Consistency Habit",
                description = "Study on at least $consistencyTarget separate days this week",
                targetValue = consistencyTarget,
                currentValue = consistencyCurrent,
                isCompleted = consistencyCurrent >= consistencyTarget,
                progressPercent = (consistencyCurrent.toFloat() / consistencyTarget).coerceIn(0f, 1f),
                icon = ChallengeIcon.CONSISTENCY
            ),
            WeeklyChallenge(
                id = "time_stretch_$weekKey",
                title = "Weekly Time Stretch",
                description = "Accumulate ${(timeStretchTargetSeconds / 3600.0).roundToInt()} hours of study time this week",
                targetValue = timeStretchTargetSeconds,
                currentValue = timeStretchCurrent,
                isCompleted = timeStretchCurrent >= timeStretchTargetSeconds,
                progressPercent = (timeStretchCurrent.toFloat() / timeStretchTargetSeconds).coerceIn(0f, 1f),
                icon = ChallengeIcon.TIME_STRETCH
            ),
            WeeklyChallenge(
                id = "personal_best_$weekKey",
                title = "Exceed Daily Peak",
                description = "Study more than ${String.format("%.1f", personalBestTargetSeconds / 3600.0)} hours in a single day",
                targetValue = personalBestTargetSeconds,
                currentValue = personalBestCurrent,
                isCompleted = personalBestCurrent >= personalBestTargetSeconds,
                progressPercent = (personalBestCurrent.toFloat() / personalBestTargetSeconds).coerceIn(0f, 1f),
                icon = ChallengeIcon.PERSONAL_BEST
            )
        )

        return MotivationState(
            adaptiveTargetMinutes = adaptiveTargetMinutes,
            isAdaptiveAboveBase = isAdaptiveAboveBase,
            momentum = momentum,
            challenges = challenges
        )
    }
}
