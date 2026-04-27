package com.aspharier.studytimer.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.aspharier.studytimer.data.local.dao.StudySessionDao
import com.aspharier.studytimer.data.local.entity.StudySessionEntity

@Database(
    entities = [StudySessionEntity::class],
    version = 1,
    exportSchema = false
)
abstract class StudyTimerDatabase : RoomDatabase() {
    abstract fun studySessionDao(): StudySessionDao
}