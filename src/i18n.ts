import { getLocales } from 'expo-localization';
export type Language='en'|'es'|'fr'|'ht';
export const supported:Record<Language,string>={en:'English',es:'Español',fr:'Français',ht:'Kreyòl ayisyen'};
export const defaultLanguage=():Language=>{const code=getLocales()[0]?.languageCode as Language;return code in supported?code:'en';};
export const strings:Record<Language,Record<string,string>>={
 en:{journey:'Journey',official:'Verify at official source',disclaimer:'Official notices always control.'},
 es:{journey:'Recorrido',official:'Verificar en la fuente oficial',disclaimer:'Los avisos oficiales siempre prevalecen.'},
 fr:{journey:'Parcours',official:'Vérifier auprès de la source officielle',disclaimer:'Les avis officiels font toujours foi.'},
 ht:{journey:'Pakou',official:'Verifye nan sous ofisyèl la',disclaimer:'Avi ofisyèl yo toujou gen priyorite.'}
};
