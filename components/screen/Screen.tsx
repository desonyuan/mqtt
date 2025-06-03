import {useAuth} from '@/contexts/AuthContext';
import {Stack} from 'expo-router';
import React, {FC, PropsWithChildren} from 'react';

type Props = {};

const Screen: FC<PropsWithChildren<Props>> = (props) => {
  const {isLoggedIn} = useAuth();
  return (
    <>
      {isLoggedIn && (
        <>
          <Stack.Screen name="(tab)" />
          <Stack.Screen name="(auth)/index" />
        </>
      )}
    </>
  );
};

export default Screen;
