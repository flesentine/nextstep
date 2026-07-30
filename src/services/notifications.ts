import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:true})});
export async function registerForPush(){if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('case-updates',{name:'Case updates',importance:Notifications.AndroidImportance.HIGH});const existing=await Notifications.getPermissionsAsync();const permission=existing.status==='granted'?existing:await Notifications.requestPermissionsAsync();if(permission.status!=='granted')throw new Error('Notifications were not allowed.');return (await Notifications.getExpoPushTokenAsync()).data;}
export async function scheduleReminder(title:string,date:Date){return Notifications.scheduleNotificationAsync({content:{title,body:'Open NextStep to review this case task.',data:{kind:'case-reminder'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date}});}
