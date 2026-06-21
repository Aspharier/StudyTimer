package com.aspharier.studytimer.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.aspharier.studytimer.data.local.dao.ExamGoalDao
import com.aspharier.studytimer.data.local.dao.StudySessionDao
import com.aspharier.studytimer.data.local.dao.SubjectDao
import com.aspharier.studytimer.data.local.dao.TopicDao
import com.aspharier.studytimer.data.local.entity.ExamGoalEntity
import com.aspharier.studytimer.data.local.entity.StudySessionEntity
import com.aspharier.studytimer.data.local.entity.SubjectEntity
import com.aspharier.studytimer.data.local.entity.TopicEntity

@Database(
    entities = [
        StudySessionEntity::class,
        ExamGoalEntity::class,
        SubjectEntity::class,
        TopicEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class StudyTimerDatabase : RoomDatabase() {
    abstract fun studySessionDao(): StudySessionDao
    abstract fun examGoalDao(): ExamGoalDao
    abstract fun subjectDao(): SubjectDao
    abstract fun topicDao(): TopicDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Add new columns to study_sessions
                db.execSQL("ALTER TABLE study_sessions ADD COLUMN notes TEXT DEFAULT NULL")
                db.execSQL("ALTER TABLE study_sessions ADD COLUMN tag TEXT DEFAULT NULL")
                db.execSQL("ALTER TABLE study_sessions ADD COLUMN subjectId INTEGER DEFAULT NULL")

                // Create exam_goals table
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS exam_goals (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        name TEXT NOT NULL,
                        examDate TEXT NOT NULL,
                        dailyTargetMinutes INTEGER NOT NULL DEFAULT 360,
                        createdAt INTEGER NOT NULL,
                        isActive INTEGER NOT NULL DEFAULT 1
                    )
                """.trimIndent())

                // Create subjects table
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS subjects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        name TEXT NOT NULL,
                        examGoalId INTEGER NOT NULL,
                        colorHex TEXT NOT NULL DEFAULT '#4D96FF',
                        sortOrder INTEGER NOT NULL DEFAULT 0,
                        FOREIGN KEY (examGoalId) REFERENCES exam_goals(id) ON DELETE CASCADE
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS index_subjects_examGoalId ON subjects(examGoalId)")

                // Create topics table
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS topics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        name TEXT NOT NULL,
                        subjectId INTEGER NOT NULL,
                        status TEXT NOT NULL DEFAULT 'NOT_STARTED',
                        sortOrder INTEGER NOT NULL DEFAULT 0,
                        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS index_topics_subjectId ON topics(subjectId)")
            }
        }

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE topics ADD COLUMN subTopicsJson TEXT DEFAULT NULL")
            }
        }
    }
}