import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Loading } from '@/components/ui';
import { ONBOARDED_KEY } from '@/services/onboarding';
export default function Index(){const [seen,setSeen]=useState<boolean|null>(null);useEffect(()=>{AsyncStorage.getItem(ONBOARDED_KEY).then(v=>setSeen(v==='1'));},[]);if(seen===null)return <Loading/>;return <Redirect href={seen?'/(tabs)':'/welcome'}/>}
