package com.aspharier.studytimer.di

import android.content.Context
import androidx.room.Room
import com.aspharier.studytimer.data.local.StudyTimerDatabase
import com.aspharier.studytimer.data.local.dao.ExamGoalDao
import com.aspharier.studytimer.data.local.dao.StudySessionDao
import com.aspharier.studytimer.data.local.dao.SubjectDao
import com.aspharier.studytimer.data.local.dao.TopicDao
import com.aspharier.studytimer.data.local.dao.MockTestDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): StudyTimerDatabase {
        return Room.databaseBuilder(
            context,
            StudyTimerDatabase::class.java,
            "study_timer_database"
        )
            .addMigrations(
                StudyTimerDatabase.MIGRATION_1_2,
                StudyTimerDatabase.MIGRATION_2_3,
                StudyTimerDatabase.MIGRATION_3_4,
                StudyTimerDatabase.MIGRATION_4_5,
                StudyTimerDatabase.MIGRATION_5_6
            )
            .build()
    }

    @Provides
    @Singleton
    fun provideStudySessionDao(database: StudyTimerDatabase): StudySessionDao {
        return database.studySessionDao()
    }

    @Provides
    @Singleton
    fun provideExamGoalDao(database: StudyTimerDatabase): ExamGoalDao {
        return database.examGoalDao()
    }

    @Provides
    @Singleton
    fun provideSubjectDao(database: StudyTimerDatabase): SubjectDao {
        return database.subjectDao()
    }

    @Provides
    @Singleton
    fun provideTopicDao(database: StudyTimerDatabase): TopicDao {
        return database.topicDao()
    }

    @Provides
    @Singleton
    fun provideMockTestDao(database: StudyTimerDatabase): MockTestDao {
        return database.mockTestDao()
    }
}