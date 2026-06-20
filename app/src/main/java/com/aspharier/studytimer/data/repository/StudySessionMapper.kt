package com.aspharier.studytimer.data.repository

import com.aspharier.studytimer.data.local.entity.StudySessionEntity
import com.aspharier.studytimer.domain.model.StudySession

fun StudySessionEntity.toModel(): StudySession = StudySession(
    id = id,
    label = label,
    durationMinutes = durationMinutes,
    completedDurationSeconds = completedDurationSeconds,
    date = date,
    startTime = startTime,
    endTime = endTime,
    isCompleted = isCompleted,
    notes = notes,
    tag = tag,
    subjectId = subjectId
)

fun StudySession.toEntity(): StudySessionEntity = StudySessionEntity(
    id = id,
    label = label,
    durationMinutes = durationMinutes,
    completedDurationSeconds = completedDurationSeconds,
    date = date,
    startTime = startTime,
    endTime = endTime,
    isCompleted = isCompleted,
    notes = notes,
    tag = tag,
    subjectId = subjectId
)