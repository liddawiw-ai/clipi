import React, {useLayoutEffect, useRef, useState} from 'react';
import {Image, Platform, Pressable, StyleSheet, Text, View} from 'react-native';

const heartSize = 40;
const nearby = (point, x, y, radius) => Math.hypot(point.x - x, point.y - y) <= radius;
const activeHeart = require('./assets/actions/like-on.png');

export default function VideoTapSurface({clipId, onDoubleTap, onPlaybackPress, playbackLabel, paused, playing}) {
  const start = useRef(null);
  const firstTap = useRef(null);
  const generation = useRef(0);
  const timeout = useRef(null);
  const singleTimer = useRef(null);
  const [heart, setHeart] = useState(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [revealCount, setRevealCount] = useState(0);
  const mayHide = playing && !paused;
  const visible = controlsVisible || !mayHide;

  function revealControls() {
    setRevealCount(count => count + 1);
  }

  useLayoutEffect(() => {
    setControlsVisible(true);
    if (!mayHide) return;
    const timer = setTimeout(() => setControlsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [clipId, mayHide, revealCount]);

  function cancelGesture() {
    clearTimeout(singleTimer.current);
    start.current = null;
    firstTap.current = null;
  }

  useLayoutEffect(() => {
    setHeart(null);
    return () => {
      generation.current += 1;
      cancelGesture();
      clearTimeout(timeout.current);
    };
  }, [clipId]);

  function down(x, y) {
    start.current = {x, y, time: Date.now()};
  }

  function move(x, y) {
    if (start.current && !nearby(start.current, x, y, 12)) cancelGesture();
  }

  function up(x, y, localX, localY) {
    const pressed = start.current;
    start.current = null;
    const now = Date.now();
    if (!pressed || now - pressed.time > 300 || !nearby(pressed, x, y, 12)) {
      cancelGesture();
      return;
    }
    const previous = firstTap.current;
    if (!previous || now - previous.time > 320 || !nearby(previous, x, y, 32)) {
      clearTimeout(singleTimer.current);
      firstTap.current = {x, y, time: now};
      singleTimer.current = setTimeout(() => {
        firstTap.current = null;
        onPlaybackPress();
      }, 320);
      return;
    }

    clearTimeout(singleTimer.current);
    firstTap.current = null;
    const active = generation.current;
    onDoubleTap(() => {
      if (active !== generation.current) return;
      clearTimeout(timeout.current);
      setHeart({left: localX - heartSize / 2, top: localY - heartSize / 2});
      timeout.current = setTimeout(() => setHeart(null), 600);
    });
  }

  const web = Platform.OS === 'web';
  const handlers = web ? {
    onPointerDown({nativeEvent: e}) {
      if (e.isPrimary === false || e.button !== 0) return cancelGesture();
      down(e.pageX, e.pageY);
    },
    onPointerMove: ({nativeEvent: e}) => move(e.pageX, e.pageY),
    onPointerUp(event) {
      const e = event.nativeEvent;
      const box = event.currentTarget.getBoundingClientRect();
      up(e.pageX, e.pageY, e.clientX - box.left, e.clientY - box.top);
    },
    onPointerCancel: cancelGesture,
    onPointerLeave() { if (start.current) cancelGesture(); }
  } : {
    onTouchStart({nativeEvent: e}) {
      if (e.touches.length !== 1) return cancelGesture();
      down(e.pageX, e.pageY);
    },
    onTouchMove: ({nativeEvent: e}) => move(e.pageX, e.pageY),
    onTouchEnd({nativeEvent: e}) {
      if (e.touches.length) return cancelGesture();
      up(e.pageX, e.pageY, e.locationX, e.locationY);
    },
    onTouchCancel: cancelGesture
  };

  return (
    <>
      <View {...handlers} testID="short-video-gestures" accessible={false} collapsable={false}
        style={[StyleSheet.absoluteFill, styles.surface, web && styles.web]}>
        {heart && <Image accessible={false} pointerEvents="none" source={activeHeart}
          style={[styles.heart, heart]} />}
      </View>
      <View pointerEvents={visible ? "box-none" : "none"} style={[StyleSheet.absoluteFill, styles.center]}>
        <Pressable testID="short-video-playback" accessibilityRole="button" accessibilityLabel={playbackLabel}
          pointerEvents={visible ? "auto" : "none"} onFocus={revealControls} onPress={onPlaybackPress}
          style={[styles.playback, !visible && styles.hidden]}>
          {paused
            ? <Text accessible={false} allowFontScaling={false} style={styles.arrow}>{'▶︎'}</Text>
            : <View pointerEvents="none" style={styles.pauseIcon}>
                <View style={styles.bar}/><View style={styles.bar}/>
              </View>}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  surface: {overflow: 'hidden'},
  center: {alignItems: 'center', justifyContent: 'center'},
  hidden: {opacity: 0},
  playback: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center'
  },
  arrow: {color: '#fff', fontSize: 27, lineHeight: 32, includeFontPadding: false, writingDirection: 'ltr'},
  pauseIcon: {flexDirection: 'row', gap: 5},
  bar: {width: 5, height: 19, borderRadius: 1, backgroundColor: '#fff'},
  web: {touchAction: 'pan-y pinch-zoom', userSelect: 'none'},
  heart: {position: 'absolute', width: heartSize, height: heartSize}
});
