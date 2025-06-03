import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from 'react-native-paper';

interface ThemedViewProps extends ViewProps {
  backgroundColor?: string;
}

export const ThemedView: React.FC<ThemedViewProps> = ({ 
  style, 
  backgroundColor,
  children,
  ...props 
}) => {
  const theme = useTheme();
  
  return (
    <View
      style={[
        { 
          backgroundColor: backgroundColor || theme.colors.background,
        },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}; 