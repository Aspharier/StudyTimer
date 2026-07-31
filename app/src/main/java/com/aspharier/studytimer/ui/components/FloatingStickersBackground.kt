package com.aspharier.studytimer.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun FloatingStickersBackground(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "stickers_drift")
    val offsetY by infiniteTransition.animateFloat(
        initialValue = -10f,
        targetValue = 10f,
        animationSpec = infiniteRepeatable(
            animation = tween(4000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "offset_y"
    )

    Box(modifier = modifier.fillMaxSize()) {
        // Floating Stickers Overlay
        Box(modifier = Modifier.fillMaxSize().alpha(0.45f)) {
            Text("✿", fontSize = 28.sp, color = Color(0xFFFF7AB6), modifier = Modifier.padding(start = 24.dp, top = 60.dp + offsetY.dp))
            Text("⭐", fontSize = 22.sp, modifier = Modifier.align(Alignment.TopEnd).padding(end = 36.dp, top = 80.dp - offsetY.dp))
            Text("🎀", fontSize = 24.sp, modifier = Modifier.padding(start = 16.dp, top = 240.dp - offsetY.dp))
            Text("✨", fontSize = 22.sp, modifier = Modifier.align(Alignment.CenterEnd).padding(end = 20.dp))
            Text("☁️", fontSize = 26.sp, modifier = Modifier.padding(start = 30.dp, top = 480.dp + offsetY.dp))
            Text("🌸", fontSize = 24.sp, modifier = Modifier.align(Alignment.BottomEnd).padding(end = 40.dp, bottom = 120.dp - offsetY.dp))
            Text("🍬", fontSize = 22.sp, modifier = Modifier.align(Alignment.BottomStart).padding(start = 40.dp, bottom = 80.dp + offsetY.dp))
            Text("🌷", fontSize = 24.sp, modifier = Modifier.align(Alignment.CenterStart).padding(start = 10.dp))
        }

        content()
    }
}
