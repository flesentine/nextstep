export const officialContentRelease={
  version:'2026.07.1',
  checkedAt:'2026-07-29',
  sources:[
    {id:'visa-bulletin',title:'Visa Bulletin',copy:'Family- and employment-based priority dates published by the Department of State.',url:'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html'},
    {id:'nvc-times',title:'NVC processing times',copy:'Current case creation and document review timeframes from the Department of State.',url:'https://travel.state.gov/content/travel/en/us-visas/immigrate/nvc-timeframes.html'},
    {id:'uscis-times',title:'USCIS processing times',copy:'Official published processing-time ranges and inquiry dates.',url:'https://egov.uscis.gov/processing-times/'},
    {id:'uscis-news',title:'USCIS updates',copy:'Official alerts, policy updates, and news releases.',url:'https://www.uscis.gov/newsroom/all-news'},
    {id:'eoir',title:'EOIR case information',copy:'Official automated case information and court resources.',url:'https://acis.eoir.justice.gov/en/'}
  ]
};

export interface CivicsQuestion {id:string;question:string;answers:string[];}
export const civicsStarter:CivicsQuestion[]=[
  {id:'q1',question:'What is the supreme law of the land?',answers:['The Constitution']},
  {id:'q2',question:'What does the Constitution do?',answers:['Sets up the government','Defines the government','Protects basic rights of Americans']},
  {id:'q3',question:'The idea of self-government is in the first three words of the Constitution. What are these words?',answers:['We the People']},
  {id:'q4',question:'What is an amendment?',answers:['A change to the Constitution','An addition to the Constitution']},
  {id:'q5',question:'What do we call the first ten amendments to the Constitution?',answers:['The Bill of Rights']},
  {id:'q6',question:'Name one right or freedom from the First Amendment.',answers:['Speech','Religion','Assembly','Press','Petition the government']},
  {id:'q7',question:'How many amendments does the Constitution have?',answers:['Twenty-seven','27']},
  {id:'q8',question:'What did the Declaration of Independence do?',answers:['Announced our independence from Great Britain','Declared our independence from Great Britain','Said that the United States is free from Great Britain']},
  {id:'q9',question:'What are two rights in the Declaration of Independence?',answers:['Life','Liberty','Pursuit of happiness']},
  {id:'q10',question:'What is freedom of religion?',answers:['You can practice any religion, or not practice a religion']}
];
export const officialCivicsUrl='https://www.uscis.gov/citizenship/find-study-materials-and-resources/study-for-the-test';
