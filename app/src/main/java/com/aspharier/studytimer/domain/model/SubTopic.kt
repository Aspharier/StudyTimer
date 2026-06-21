package com.aspharier.studytimer.domain.model

data class SubTopic(
    val id: String,
    val name: String,
    val status: TopicStatus = TopicStatus.NOT_STARTED
)
