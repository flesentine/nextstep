import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function RootLayout(){const load=useAppStore(s=>s.load);useEffect(()=>{load();},[load]);return <SafeAreaProvider><StatusBar style="auto"/><Stack screenOptions={{headerShown:false}}><Stack.Screen name="index"/><Stack.Screen name="welcome"/><Stack.Screen name="(tabs)"/><Stack.Screen name="add" options={{presentation:'modal'}}/><Stack.Screen name="case/[id]"/><Stack.Screen name="progress"/><Stack.Screen name="cohorts"/><Stack.Screen name="civics"/><Stack.Screen name="official-updates"/><Stack.Screen name="account" options={{presentation:'modal'}}/><Stack.Screen name="subscription" options={{presentation:'modal'}}/></Stack></SafeAreaProvider>}
