import {
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetScrollView,
  BottomSheetView,
  useBottomSheetModal,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import React, {FC, ForwardRefRenderFunction, PropsWithChildren, forwardRef, useMemo} from 'react';

import {Pressable} from 'react-native';
import Animated, {Extrapolation, interpolate, useAnimatedStyle} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export const CustomBackdrop: FC<BottomSheetBackdropProps & {preventBackDropClose?: boolean}> = ({
  animatedIndex,
  style,
  preventBackDropClose,
}) => {
  const {dismiss} = useBottomSheetModal();
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    // opacity: interpolate(animatedIndex.value, [-1, 0], [0, 0.6], Extrapolation.CLAMP),
    backgroundColor: `rgba(0,0,0,${interpolate(animatedIndex.value, [-1, 0], [0, 0.5], Extrapolation.CLAMP)})`,
  }));

  return (
    <Animated.View style={[style, containerAnimatedStyle]}>
      <Pressable
        style={{flex: 1}}
        onPress={() => {
          if (!preventBackDropClose) {
            dismiss();
          }
        }}
      />
    </Animated.View>
  );
};

const BottomPopup: ForwardRefRenderFunction<
  BottomSheetModal,
  PropsWithChildren<
    BottomSheetModalProps & {
      as?: 'scroll' | 'custom';
      preventBackDropClose?: true; //阻止点击背景关闭
      mask?: boolean; //是否需要遮罩层
      duration?: number; //弹出持续毫秒
    }
  >
> = (
  {children, as, preventBackDropClose, animationConfigs, snapPoints, mask = true, duration = 400, ...otherProp},
  ref
) => {
  const insets = useSafeAreaInsets();
  const animationConfig = useBottomSheetTimingConfigs({
    duration,
  });

  // 默认配置参数
  const defaultOpt = useMemo(() => {
    const option: Omit<BottomSheetModalProps, 'children'> = {
      enablePanDownToClose: true,
      animationConfigs: animationConfigs ?? animationConfig,
    };
    if (mask) {
      option.backdropComponent = (prop: any) => (
        <CustomBackdrop {...prop} preventBackDropClose={preventBackDropClose} />
      );
    }
    if (snapPoints) {
      option.snapPoints = snapPoints;
      option.enableDynamicSizing = false;
    } else {
      option.enableDynamicSizing = true;
    }
    return option;
  }, [mask, duration]);

  return (
    <BottomSheetModal
      ref={ref}
      bottomInset={insets.bottom}
      backgroundStyle={{backgroundColor: 'white'}}
      {...defaultOpt}
      {...otherProp}
    >
      {as === 'scroll' ? (
        <BottomSheetScrollView>{children}</BottomSheetScrollView>
      ) : as === 'custom' ? (
        children
      ) : (
        <BottomSheetView>{children}</BottomSheetView>
      )}
    </BottomSheetModal>
  );
};

export {BottomSheetModal};

export default forwardRef(BottomPopup);
