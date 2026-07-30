import { useColorScheme } from 'react-native';

const light = { background:'#F6F3EC', surface:'#FFFFFF', ink:'#17312D', muted:'#667873', primary:'#315F58', primarySoft:'#DCEAE6', accent:'#D7865B', line:'#DDE4E1', good:'#3D7A61', warning:'#A76536' };
const dark = { background:'#10201D', surface:'#172A26', ink:'#F6F3EC', muted:'#A9BAB5', primary:'#8FC4B7', primarySoft:'#24433C', accent:'#F0A97E', line:'#31504A', good:'#8AC9A5', warning:'#F0B087' };
export const useTheme = () => useColorScheme() === 'dark' ? dark : light;
export type Theme = typeof light;
