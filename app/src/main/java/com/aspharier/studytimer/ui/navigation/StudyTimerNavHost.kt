package com.aspharier.studytimer.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.aspharier.studytimer.ui.screens.history.HistoryScreen
import com.aspharier.studytimer.ui.screens.profile.ProfileScreen
import com.aspharier.studytimer.ui.screens.timer.TimerScreen
import com.aspharier.studytimer.ui.theme.AppTheme

@Composable
fun StudyTimerNavHost(
    navController: NavHostController = rememberNavController(),
    selectedTheme: AppTheme = AppTheme.Midnight,
    onThemeSelected: (AppTheme) -> Unit = {}
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            NavHost(
                navController = navController,
                startDestination = Screen.History.route,
                enterTransition = {
                    slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Left,
                        animationSpec = tween(300)
                    )
                },
                exitTransition = {
                    slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Left,
                        animationSpec = tween(300)
                    )
                },
                popEnterTransition = {
                    slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Right,
                        animationSpec = tween(300)
                    )
                },
                popExitTransition = {
                    slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Right,
                        animationSpec = tween(300)
                    )
                }
            ) {
                composable(Screen.History.route) {
                    HistoryScreen(
                        selectedTheme = selectedTheme,
                        onThemeSelected = onThemeSelected,
                        onProfileClick = {
                            navController.navigate(Screen.Profile.route)
                        },
                        onSessionClick = { sessionId ->
                            navController.navigate(Screen.Timer.createRoute(sessionId))
                        }
                    )
                }

                composable(Screen.Profile.route) {
                    ProfileScreen(
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                composable(
                    route = Screen.Timer.route,
                    arguments = listOf(
                        navArgument("sessionId") { type = NavType.LongType }
                    )
                ) { backStackEntry ->
                    val sessionId = backStackEntry.arguments?.getLong("sessionId") ?: 0L
                    TimerScreen(
                        sessionId = sessionId,
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
            }
        }
    }
}
