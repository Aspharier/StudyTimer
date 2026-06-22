package com.aspharier.studytimer.domain

import com.aspharier.studytimer.domain.model.ExamGoal
import com.aspharier.studytimer.domain.model.StudySession
import com.aspharier.studytimer.domain.model.Topic
import com.aspharier.studytimer.domain.model.TopicStatus
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.max
import kotlin.math.min

object StudyPlanEngine {

    fun getDailyRecommendations(
        topics: List<Topic>,
        sessions: List<StudySession>,
        examGoal: ExamGoal?
    ): List<Topic> {
        if (examGoal == null || topics.isEmpty()) return emptyList()

        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
        val today = LocalDate.now()
        val examLocalDate = runCatching { LocalDate.parse(examGoal.examDate, formatter) }.getOrDefault(today)
        val daysRemaining = max(0L, ChronoUnit.DAYS.between(today, examLocalDate))
        val proximityMultiplier = 1.0 + (30.0 / (daysRemaining + 10.0))

        // Build a map of subjectId -> last studied timestamp in milliseconds
        val lastStudiedMap = mutableMapOf<Long, Long>()
        sessions.forEach { s ->
            if (s.subjectId != null && s.completedDurationSeconds > 0) {
                val dateVal = runCatching { LocalDate.parse(s.date, formatter) }.getOrNull()
                if (dateVal != null) {
                    val epochDays = dateVal.toEpochDay()
                    val existing = lastStudiedMap[s.subjectId] ?: 0L
                    if (epochDays > existing) {
                        lastStudiedMap[s.subjectId] = epochDays
                    }
                }
            }
        }

        val todayEpochDays = today.toEpochDay()

        val scoredTopics = topics.map { topic ->
            val statusWeight = when (topic.status) {
                TopicStatus.NEEDS_REVISION -> 1.0
                TopicStatus.IN_PROGRESS -> 0.7
                TopicStatus.NOT_STARTED -> 0.4
                TopicStatus.COMPLETED -> 0.0
            }

            if (statusWeight == 0.0) {
                return@map Pair(topic, -1.0)
            }

            val lastStudiedEpoch = lastStudiedMap[topic.subjectId]
            val recencyDays = if (lastStudiedEpoch != null) {
                min(99.0, (todayEpochDays - lastStudiedEpoch).toDouble())
            } else {
                99.0
            }

            val dps = ((recencyDays * 0.5) + (statusWeight * 40.0)) * proximityMultiplier
            Pair(topic, dps)
        }

        return scoredTopics
            .filter { it.second >= 0.0 }
            .sortedByDescending { it.second }
            .take(3)
            .map { it.first }
    }
}
