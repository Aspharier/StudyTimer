package com.aspharier.studytimer.ui.navigation

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

sealed class Screen(
    val route: String,
    val title: String,
    val icon: @Composable () -> Unit = {}
) {
    data object Onboarding : Screen(
        route = "onboarding",
        title = "Welcome"
    )

    data object Dashboard : Screen(
        route = "dashboard",
        title = "Dashboard",
        icon = { Text("D") }
    )

    data object Home : Screen(
        route = "home",
        title = "Timer Setup",
        icon = { Text("H") }
    )

    data object Timer : Screen(
        route = "timer/{sessionId}",
        title = "Study",
        icon = { Text("S") }
    ) {
        fun createRoute(sessionId: Long) = "timer/$sessionId"
    }

    data object Profile : Screen(
        route = "profile",
        title = "Profile",
        icon = { Text("P") }
    )

    data object Syllabus : Screen(
        route = "syllabus",
        title = "Syllabus",
        icon = { Text("B") }
    )

    data object ExamSetup : Screen(
        route = "exam_setup",
        title = "Exam Setup"
    )

    data object MockTest : Screen(
        route = "mock_test",
        title = "Mock Tests"
    )
}
