import React, {useLayoutEffect, useRef, useState} from 'react';
import {Image, Platform, StyleSheet, View} from 'react-native';

const heartSize = 40;
const nearby = (point, x, y, radius) => Math.hypot(point.x - x, point.y - y) <= radius;
const activeHeart = require('./assets/actions/like-on.png');

export default function VideoTapSurface({clipId, onDoubleTap}) {
  const start = useRef(null);
  const firstTap = useRef(null);
  const generation = useRef(0);
  const timeout = useRef(null);
  const [heart, setHeart] = useState(null);

  function cancelGesture() {
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
      firstTap.current = {x, y, time: now};
      return;
    }

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
    <View {...handlers} accessible={false} collapsable={false}
      style={[StyleSheet.absoluteFill, styles.surface, web && styles.web]}>
      {heart && <Image accessible={false} pointerEvents="none" source={activeHeart}
        style={[styles.heart, heart]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {overflow: 'hidden'},
  web: {touchAction: 'pan-y pinch-zoom', userSelect: 'none'},
  heart: {position: 'absolute', width: heartSize, height: heartSize}
});
