import { GoogleGenAI, Type, Modality } from "@google/genai";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface Dua {
  id: number;
  arabic: string;
  transliteration: string;
  translation: string;
  translationMalay: string;
  reference?: string;
  audioUrl?: string;
  videoUrl?: string;
  context?: string;
}

const RABBANA_DUAS: Dua[] = [
  {
    id: 1,
    arabic: "رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ",
    transliteration: "Rabbana taqabbal minna innaka antas-sami'ul-'alim",
    translation: "Our Lord, accept [this] from us. Indeed You are the Hearing, the Knowing.",
    translationMalay: "Wahai Tuhan kami, terimalah daripada kami (amal kami); sesungguhnya Engkaulah Yang Maha Mendengar, lagi Maha Mengetahui.",
    reference: "2:127"
  },
  {
    id: 2,
    arabic: "رَبَّنَا وَاجْعَلْنَا مُسْلِمَيْنِ لَكَ وَمِنْ ذُرِّيَّتِنَا أُمَّةً مُسْلِمَةً لَكَ وَأَرِنَا مَنَاسِكَنَا وَتُبْ عَلَيْنَا إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
    transliteration: "Rabbana wa-j'alna muslimayni laka wa min dhurriyyatina ummatan muslimatan laka wa arina manasikana wa tub 'alayna innaka antat-tawwabur-rahim",
    translation: "Our Lord, and make us Muslims [in submission] to You and from our descendants a Muslim nation [in submission] to You. And show us our rites and accept our repentance. Indeed, You are the Accepting of repentance, the Merciful.",
    translationMalay: "Wahai Tuhan kami! Jadikanlah kami berdua orang-orang Islam (yang berserah diri) kepada-Mu, dan jadikanlah daripada keturunan kami umat Islam (yang berserah diri) kepada-Mu, dan tunjukkanlah kepada kami cara-cara ibadat kami, dan terimalah taubat kami; sesungguhnya Engkaulah Yang Maha Penerima Taubat, lagi Maha Mengasihani.",
    reference: "2:128"
  },
  {
    id: 3,
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan waqina 'adhaban-nar",
    translation: "Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire.",
    translationMalay: "Wahai Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan peliharalah kami dari azab neraka.",
    reference: "2:201"
  },
  {
    id: 4,
    arabic: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    transliteration: "Rabbana afrigh 'alayna sabran wa thabbit aqdamana wansurna 'alal-qawmil-kafirin",
    translation: "Our Lord, pour upon us patience and plant firmly our feet and give us victory over the disbelieving people.",
    translationMalay: "Wahai Tuhan kami! Limpahkanlah sabar kepada kami, dan teguhkanlah tapak pendirian kami serta tolonglah kami mencapai kemenangan terhadap kaum yang kafir.",
    reference: "2:250"
  },
  {
    id: 5,
    arabic: "رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا",
    transliteration: "Rabbana la tu'akhidhna in-nasina aw akhta'na",
    translation: "Our Lord, do not impose blame upon us if we have forgotten or erred.",
    translationMalay: "Wahai Tuhan kami! Janganlah Engkau menghukum kami jika kami lupa atau kami tersalah.",
    reference: "2:286"
  },
  {
    id: 6,
    arabic: "رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا",
    transliteration: "Rabbana wala tahmil 'alayna isran kama hamaltahu 'alal-ladhina min qablina",
    translation: "Our Lord, and lay not upon us a burden like that which You laid upon those before us.",
    translationMalay: "Wahai Tuhan kami! Janganlah Engkau bebankan kepada kami bebanan yang berat sebagaimana yang telah Engkau bebankan kepada orang-orang yang terdahulu daripada kami.",
    reference: "2:286"
  },
  {
    id: 7,
    arabic: "رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    transliteration: "Rabbana wala tuhammilna ma la taqata lana bihi wa'fu 'anna waghfir lana warhamna anta mawlana fansurna 'alal-qawmil-kafirin",
    translation: "Our Lord, and burden us not with that which we have no ability to bear. And pardon us; and forgive us; and have mercy upon us. You are our protector, so give us victory over the disbelieving people.",
    translationMalay: "Wahai Tuhan kami! Janganlah Engkau pikulkan kepada kami apa yang kami tidak terdaya memikulnya. Dan maafkanlah kesalahan kami, dan ampunkanlah dosa kami, dan berilah rahmat kepada kami. Engkaulah Penolong kami; oleh itu, tolonglah kami untuk mencapai kemenangan terhadap kaum-kaum yang kafir.",
    reference: "2:286"
  },
  {
    id: 8,
    arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ",
    transliteration: "Rabbana la tuzigh qulubana ba'da idh hadaytana wahab lana mil-ladunka rahmatan innaka antal-wahhab",
    translation: "Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy. Indeed, You are the Bestower.",
    translationMalay: "Wahai Tuhan kami! Janganlah Engkau memesongkan hati kami sesudah Engkau beri petunjuk kepada kami, dan kurniakanlah kepada kami limpah rahmat dari sisi-Mu; sesungguhnya Engkau jualah Tuhan Yang melimpah-limpah pemberian-Nya.",
    reference: "3:8"
  },
  {
    id: 9,
    arabic: "رَبَّنَا إِنَّكَ جَامِعُ النَّاسِ لِيَوْمٍ لَّا رَيْبَ فِيهِ ۚ إِنَّ اللَّهَ لَا يُخْلِفُ الْمِيعَادَ",
    transliteration: "Rabbana innaka jami'un-nasi liyawmil la rayba fihi innal-laha la yukhliful-mi'ad",
    translation: "Our Lord, surely You will gather the people for a Day about which there is no doubt. Indeed, Allah does not fail in His promise.",
    translationMalay: "Wahai Tuhan kami! Sesungguhnya Engkaulah yang mengumpulkan umat manusia pada hari kiamat yang tidak ada keraguan padanya. Sesungguhnya Allah tidak memungkiri janji-Nya.",
    reference: "3:9"
  },
  {
    id: 10,
    arabic: "رَبَّنَا إِنَّنَا آمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ",
    transliteration: "Rabbana innana amanna faghfir lana dhunubana waqina 'adhaban-nar",
    translation: "Our Lord, indeed we have believed, so forgive us our sins and protect us from the punishment of the Fire.",
    translationMalay: "Wahai Tuhan kami! Sesungguhnya kami telah beriman, oleh itu ampunkanlah dosa-dosa kami dan peliharalah kami dari azab neraka.",
    reference: "3:16"
  },
  {
    id: 11,
    arabic: "رَبَّنَا آمَنَّا بِمَا أَنزَلْتَ وَاتَّبَعْنَا الرَّسُولَ فَاكْتُبْنَا مَعَ الشَّاهِدِينَ",
    transliteration: "Rabbana amanna bima anzalta wattaba'nar-rasula faktubna ma'ash-shahidin",
    translation: "Our Lord, we have believed in what You revealed and have followed the messenger, so register us among the witnesses [to truth].",
    translationMalay: "Wahai Tuhan kami! Kami telah beriman kepada apa yang telah Engkau turunkan, dan kami mengikut Rasul-Mu; oleh itu tuliskanlah kami bersama-sama orang-orang yang menjadi saksi (yang mengakui keesaan-Mu dan kebenaran Rasul-Mu).",
    reference: "3:53"
  },
  {
    id: 12,
    arabic: "رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    transliteration: "Rabbanagh-fir lana dhunubana wa israfana fi amrina wa thabbit aqdamana wansurna 'alal-qawmil-kafirin",
    translation: "Our Lord, forgive us our sins and the excess in our affairs and plant firmly our feet and give us victory over the disbelieving people.",
    translationMalay: "Wahai Tuhan kami! Ampunkanlah dosa-dosa kami dan keterlanjuran kami dalam urusan kami, dan teguhkanlah pendirian kami (dalam perjuangan), serta tolonglah kami mencapai kemenangan terhadap kaum yang kafir.",
    reference: "3:147"
  },
  {
    id: 13,
    arabic: "رَبَّنَا مَا خَلَقْتَ هَٰذَا بَاطِلًا سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ",
    transliteration: "Rabbana ma khalaqta hadha batilan subhanaka faqina 'adhaban-nar",
    translation: "Our Lord, You did not create this aimlessly; exalted are You [above such a thing]; then protect us from the punishment of the Fire.",
    translationMalay: "Wahai Tuhan kami! Tidaklah Engkau menciptakan ini dengan sia-sia, Maha Suci Engkau, maka peliharalah kami dari azab neraka.",
    reference: "3:191"
  },
  {
    id: 14,
    arabic: "رَبَّنَا إِنَّكَ مَن تُدْخِلِ النَّارَ فَقَدْ أَخْزَيْتَهُ ۖ وَمَا لِلظَّالِمِينَ مِنْ أَنصَارٍ",
    transliteration: "Rabbana innaka man tudkhilin-nara faqad akhzaytahu wa ma lizzalimina min ansar",
    translation: "Our Lord, indeed whoever You admit to the Fire - You have disgraced him, and for the wrongdoers there are no helpers.",
    translationMalay: "Wahai Tuhan kami! Sebenarnya sesiapa yang Engkau masukkan ke dalam neraka maka sesungguhnya Engkau telah menghinakannya, dan orang-orang yang zalim tidak akan beroleh sesiapapun yang dapat menolongnya.",
    reference: "3:192"
  },
  {
    id: 15,
    arabic: "رَبَّنَا إِنَّنَا سَمِعْنَا مُنَادِيًا يُنَادِي لِلْإِيمَانِ أَنْ آمِنُوا بِرَبِّكُمْ فَآمَنَّا",
    transliteration: "Rabbana innana sami'na munadiyan yunadi lil-imani an aminu birabbikum fa'amanna",
    translation: "Our Lord, indeed we have heard a caller calling to faith, [saying], 'Believe in your Lord,' and we have believed.",
    translationMalay: "Wahai Tuhan kami! Sesungguhnya kami telah mendengar seorang Penyeru (Rasul) yang menyeru kepada iman, katanya: 'Berimanlah kamu kepada Tuhan kamu', maka kami pun beriman.",
    reference: "3:193"
  },
  {
    id: 16,
    arabic: "رَبَّنَا فَاغْفِرْ لَنَا ذُنُوبَنَا وَكَفِّرْ عَنَّا سَيِّئَاتِنَا وَتَوَفَّنَا مَعَ الْأَبْرَارِ",
    transliteration: "Rabbana faghfir lana dhunubana wa kaffir 'anna sayyi'atina wa tawaffana ma'al-abrar",
    translation: "Our Lord, so forgive us our sins and remove from us our misdeeds and cause us to die with the righteous.",
    translationMalay: "Wahai Tuhan kami! Ampunkanlah dosa-dosa kami, dan hapuskanlah daripada kami kesalahan-kesalahan kami, dan matikanlah kami bersama orang-orang yang berbakti (soleh).",
    reference: "3:193"
  },
  {
    id: 17,
    arabic: "رَبَّنَا وَآتِنَا مَا وَعَدتَّنَا عَلَىٰ رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ الْقِيَامَةِ ۗ إِنَّكَ لَا تُخْلِفُ الْمِيعَادَ",
    transliteration: "Rabbana wa atina ma wa'adtana 'ala rusulika wala tukhzina yawmal-qiyamati innaka la yukhliful-mi'ad",
    translation: "Our Lord, and grant us what You promised us through Your messengers and do not disgrace us on the Day of Resurrection. Indeed, You do not fail in Your promise.",
    translationMalay: "Wahai Tuhan kami! Berikanlah kepada kami pahala yang telah Engkau janjikan kepada kami melalui Rasul-rasul-Mu, dan janganlah Engkau hinakan kami pada hari kiamat; sesungguhnya Engkau tidak memungkiri janji.",
    reference: "3:194"
  },
  {
    id: 18,
    arabic: "رَبَّنَا آمَنَّا فَاكْتُبْنَا مَعَ الشَّاهِدِينَ",
    transliteration: "Rabbana amanna faktubna ma'ash-shahidin",
    translation: "Our Lord, we have believed, so register us among the witnesses.",
    translationMalay: "Wahai Tuhan kami, kami telah beriman (kepada Kitab Suci Al-Quran dan Rasul Muhammad s.a.w), oleh itu tetapkanlah kami bersama-sama orang-orang yang menjadi saksi (yang mengakui kebenaranmu).",
    reference: "5:83"
  },
  {
    id: 19,
    arabic: "رَبَّنَا أَنزِلْ عَلَيْنَا مَائِدَةً مِّنَ السَّمَاءِ تَكُونُ لَنَا عِيدًا لِّأَوَّلِنَا وَآخِرِنَا وَآيَةً مِّنكَ ۖ وَارْزُقْنَا وَأَنتَ خَيْرُ الرَّازِقِينَ",
    transliteration: "Rabbana anzil 'alayna ma'idatam minas-sama'i takunu lana 'idal li'awwalina wa akhirina wa ayatam minka warzuqna wa anta khayrur-raziqin",
    translation: "Our Lord, send down to us a table [spread with food] from the heaven to be for us a festival for the first of us and the last of us and a sign from You. And provide for us, and You are the best of providers.",
    translationMalay: "Wahai Tuhan kami! Turunkanlah kepada kami hidangan dari langit, untuk menjadi hari raya bagi kami, iaitu bagi orang-orang kami yang ada sekarang dan bagi orang-orang kami yang datang kemudian; dan sebagai satu tanda (mukjizat) daripadamu; dan kurniakanlah rezeki kepada kami, kerana Engkau jualah sebaik-baik Pemberi rezeki.",
    reference: "5:114"
  },
  {
    id: 20,
    arabic: "رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
    transliteration: "Rabbana zalamna anfusana wa il-lam taghfir lana watarhamna lanakunanna minal-khasirin",
    translation: "Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will surely be among the losers.",
    translationMalay: "Wahai Tuhan kami, kami telah menganiaya diri kami sendiri, dan kalau Engkau tidak mengampunkan kami dan memberi rahmat kepada kami, nescaya menjadilah kami dari orang-orang yang rugi.",
    reference: "7:23"
  },
  {
    id: 21,
    arabic: "رَبَّنَا لَا تَجْعَلْنَا مَعَ الْقَوْمِ الظَّالِمِينَ",
    transliteration: "Rabbana la taj'alna ma'al-qawmiz-zalimin",
    translation: "Our Lord, do not place us with the wrongdoing people.",
    translationMalay: "Wahai Tuhan kami! Janganlah Engkau jadikan kami bersama-sama kaum yang zalim.",
    reference: "7:47"
  },
  {
    id: 22,
    arabic: "رَبَّنَا افْتَحْ بَيْنَنَا وَبَيْنَ قَوْمِنَا بِالْحَقِّ وَأَنتَ خَيْرُ الْفَاتِحِينَ",
    transliteration: "Rabbanaftah baynana wa bayna qawmina bil-haqqi wa anta khayrul-fatihin",
    translation: "Our Lord, decide between us and our people in truth, and You are the best of those who give decision.",
    translationMalay: "Wahai Tuhan kami! Hukumkanlah antara kami dan kaum kami dengan kebenaran (keadilan), kerana Engkaulah sebaik-baik Hakim.",
    reference: "7:89"
  },
  {
    id: 23,
    arabic: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَتَوَفَّنَا مُسْلِمِينَ",
    transliteration: "Rabbana afrigh 'alayna sabran wa tawaffana muslimin",
    translation: "Our Lord, pour upon us patience and let us die as Muslims [in submission to You].",
    translationMalay: "Wahai Tuhan kami, limpahkanlah sabar kepada kami, dan matikanlah kami dalam keadaan Islam (berserah diri bulat-bulat kepada-Mu).",
    reference: "7:126"
  },
  {
    id: 24,
    arabic: "رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلْقَوْمِ الظَّالِمِينَ ; وَنَجِّنَا بِرَحْمَتِكَ مِنَ الْقَوْمِ الْكَافِرِينَ",
    transliteration: "Rabbana la taj'alna fitnatal lil-qawmiz-zalimin wa najjina birahmatika minal-qawmil-kafirin",
    translation: "Our Lord, make us not [objects of] trial for the wrongdoing people. And save us by Your mercy from the disbelieving people.",
    translationMalay: "Wahai Tuhan kami! Janganlah Engkau jadikan kami subjek fitnah (sasaran aniaya) bagi kaum yang zalim. Dan selamatkanlah kami dengan rahmat-Mu dari angkara kaum yang kafir.",
    reference: "10:85-86"
  },
  {
    id: 25,
    arabic: "رَبَّنَا إِنَّكَ تَعْلَمُ مَا نُخْفِي وَمَا نُعْلِنُ ۗ وَمَا يَخْفَىٰ عَلَى اللَّهِ مِن شَيْءٍ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ",
    transliteration: "Rabbana innaka ta'lamu ma nukhfi wa ma nu'linu wa ma yakhfa 'alal-lahi min shay'in fil-ardi wala fis-sama'",
    translation: "Our Lord, indeed You know what we conceal and what we declare, and nothing is hidden from Allah on the earth or in the heaven.",
    translationMalay: "Wahai Tuhan kami! Sesungguhnya Engkau mengetahui apa yang kami sembunyikan dan apa yang kami zahirkan; dan tidak ada sesuatupun di bumi dan di langit yang tersembunyi dari pengetahuan Allah!",
    reference: "14:38"
  },
  {
    id: 26,
    arabic: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ",
    transliteration: "Rabbij-'alni muqimas-salati wa min dhurriyyati rabbana wa taqabbal du'a'",
    translation: "My Lord, make me an establisher of prayer, and [many] from my descendants. Our Lord, and accept my supplication.",
    translationMalay: "Wahai Tuhanku! Jadikanlah daku orang yang mendirikan sembahyang dan demikianlah juga zuriat keturunanku. Wahai Tuhan kami, perkenankanlah doa permohonanku.",
    reference: "14:40"
  },
  {
    id: 27,
    arabic: "رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ",
    transliteration: "Rabbanagh-fir li waliwalidayya walil-mu'minina yawma yaqumul-hisab",
    translation: "Our Lord, forgive me and my parents and the believers the Day the account is established.",
    translationMalay: "Wahai Tuhan kami! Berilah ampun bagiku dan bagi kedua ibu bapaku serta bagi orang-orang yang beriman, pada masa berlakunya hitungan amal dan pembalasan.",
    reference: "14:41"
  },
  {
    id: 28,
    arabic: "رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا",
    transliteration: "Rabbana atina mil-ladunka rahmatan wa hayyi' lana min amrina rashada",
    translation: "Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance.",
    translationMalay: "Wahai Tuhan kami! Kurniakanlah kami rahmat dari sisi-Mu, dan berilah kemudahan serta pimpinan kepada kami untuk keselamatan agama kami.",
    reference: "18:10"
  },
  {
    id: 29,
    arabic: "رَبَّنَا إِنَّنَا نَخَافُ أَن يَفْرُطَ عَلَيْنَا أَوْ أَن يَطْغَىٰ",
    transliteration: "Rabbana innana nakhafu an yafruta 'alayna aw an yatgha",
    translation: "Our Lord, indeed we are afraid that he will hasten [punishment] against us or that he will transgress.",
    translationMalay: "Wahai Tuhan kami! Sesungguhnya kami takut bahawa ia akan segera menyeksa kami, atau ia akan melampaui batas.",
    reference: "20:45"
  },
  {
    id: 30,
    arabic: "رَبَّنَا آمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَأَنتَ خَيْرُ الرَّاحِمِينَ",
    transliteration: "Rabbana amanna faghfir lana warhamna wa anta khayrur-rahimin",
    translation: "Our Lord, we have believed, so forgive us and have mercy upon us, and You are the best of the merciful.",
    translationMalay: "Wahai Tuhan kami, kami telah beriman; oleh itu ampunkanlah dosa kami serta berilah rahmat kepada kami, dan sememangnya Engkaulah jua sebaik-baik Pemberi rahmat.",
    reference: "23:109"
  },
  {
    id: 31,
    arabic: "رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ ۖ إِنَّ عَذَابَهَا كَانَ غَرَامًا",
    transliteration: "Rabbanas-rif 'anna 'adhaba jahannama inna 'adhabaha kana gharama",
    translation: "Our Lord, avert from us the punishment of Hell. Indeed, its punishment is ever adhering.",
    translationMalay: "Wahai Tuhan kami, sisihkanlah azab neraka Jahannam dari kami, sesungguhnya azab seksanya itu adalah mengerikan.",
    reference: "25:65"
  },
  {
    id: 32,
    arabic: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
    transliteration: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yunin waj'alna lil-muttaqina imama",
    translation: "Our Lord, grant us from among our wives and offspring comfort to our eyes and make us an example for the righteous.",
    translationMalay: "Wahai Tuhan kami, berilah kami beroleh dari isteri-isteri dan zuriat keturunan kami: perkara-perkara yang menyukakan hati melihatnya, dan jadikanlah kami imam ikutan bagi orang-orang yang (mahu) bertaqwa.",
    reference: "25:74"
  },
  {
    id: 33,
    arabic: "رَبَّنَا لَغَفُورٌ شَكُورٌ",
    transliteration: "Rabbana laghafurun shakur",
    translation: "Our Lord is indeed Forgiving and Appreciative.",
    translationMalay: "Sesungguhnya Tuhan kami Maha Pengampun, lagi sentiasa memberi balasan yang sebaik-baiknya (kepada orang-orang yang taat).",
    reference: "35:34"
  },
  {
    id: 34,
    arabic: "رَبَّنَا وَسِعْتَ كُلَّ شَيْءٍ رَّحْمَةً وَعِلْمًا فَاغْفِرْ لِلَّذِينَ تَابُوا وَاتَّبَعُوا سَبِيلَكَ وَقِهِمْ عَذَابَ الْجَحِيمِ",
    transliteration: "Rabbana wasi'ta kulla shay'ir rahmatan wa 'ilman faghfir lilladhina tabu wattaba'u sabilaka waqihim 'adhabal-jahim",
    translation: "Our Lord, You have encompassed all things in mercy and knowledge, so forgive those who have repented and followed Your way and protect them from the punishment of Hellfire.",
    translationMalay: "Wahai Tuhan kami! Rahmat-Mu dan Ilmu-Mu meliputi segala-galanya; maka berilah ampun kepada orang-orang yang bertaubat serta menurut jalan-Mu, dan peliharalah mereka dari azab neraka.",
    reference: "40:7"
  },
  {
    id: 35,
    arabic: "رَبَّنَا وَأَدْخِلْهُمْ جَنَّاتِ عَدْنٍ الَّتِي وَعَدتَّهُمْ وَمَن صَلَحَ مِنْ آبَائِهِمْ وَأَزْوَاجِهِمْ وَذُرِّيَّاتِهِمْ ۚ إِنَّكَ أَنتَ الْعَزِيزُ الْحَكِيمُ ; وَقِهِمُ السَّيِّئَاتِ ۚ وَمَن تَقِ السَّيِّئَاتِ يَوْمَئِذٍ فَقَدْ رَحِمْتَهُ ۚ وَذَٰلِكَ هُوَ الْفَوْزُ الْعَظِيمُ",
    transliteration: "Rabbana wa adkhilhum jannati 'adninil-lati wa'adtahum wa man salaha min aba'ihim wa azwajihim wa dhurriyyatihim innaka antal-'azizul-hakim waqihimus-sayyi'at",
    translation: "Our Lord, and admit them to gardens of perpetual residence which You have promised them and whoever was righteous among their fathers, their spouses and their offspring. Indeed, it is You who is the Exalted in Might, the Wise. And protect them from the evil consequences [of their sins].",
    translationMalay: "Wahai Tuhan kami! Dan masukkanlah mereka ke dalam Syurga 'Adn yang Engkau telah janjikan kepada mereka; dan (masukkanlah bersama-sama mereka): orang-orang yang soleh dari ibu bapa mereka, dan isteri-isteri mereka, serta keturunan mereka. Sesungguhnya Engkaulah jua Yang Maha Kuasa, lagi Maha Bijaksana. Dan peliharalah mereka dari balasan kejahatan-kejahatan.",
    reference: "40:8-9"
  },
  {
    id: 36,
    arabic: "رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ وَلَا تَجْعَلْ فِي قُلُوبِنَا غِلًّا لِّلَّذِينَ آمَنُوا رَبَّنَا إِنَّكَ رَءُوفٌ رَّحِيمٌ",
    transliteration: "Rabbanagh-fir lana wali-ikhwaninal-ladhina sabaquna bil-imani wala taj'al fi qulubina ghillal lilladhina amanu rabbana innaka ra'ufur rahim",
    translation: "Our Lord, forgive us and our brothers who preceded us in faith and put not in our hearts [any] resentment toward those who have believed. Our Lord, indeed You are Kind and Merciful.",
    translationMalay: "Wahai Tuhan kami! Ampunkanlah dosa kami dan dosa saudara-saudara kami yang telah beriman lebih dahulu daripada kami, dan janganlah Engkau jadikan dalam hati kami perasaan hasad dengki dan dendam terhadap orang-orang yang beriman. Wahai Tuhan kami! Sesungguhnya Engkau Amat Melimpah Belas Kasihan dan Rahmat-Mu.",
    reference: "59:10"
  },
  {
    id: 37,
    arabic: "رَبَّنَا عَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ أَنَبْنَا وَإِلَيْكَ الْمَصِيرُ",
    transliteration: "Rabbana 'alayka tawakkalna wa ilayka anabna wa ilaykal-masir",
    translation: "Our Lord, upon You we have relied, and to You we have returned, and to You is the destination.",
    translationMalay: "Wahai Tuhan kami! Kepada-Mu jualah kami berserah diri, dan kepada-Mu jualah kami rujuk bertaubat, serta kepada-Mu jualah tempat kembali!",
    reference: "60:4"
  },
  {
    id: 38,
    arabic: "رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلَّذِينَ كَفَرُوا وَاغْفِرْ لَنَا رَبَّنَا ۖ إِنَّكَ أَنتَ الْعَزِيزُ الْحَكِيمُ",
    transliteration: "Rabbana la taj'alna fitnatal lilladhina kafaru waghfir lana rabbana innaka antal-'azizul-hakim",
    translation: "Our Lord, make us not [objects of] ordeal for the disbelievers, and forgive us, our Lord. Indeed, it is You who is the Exalted in Might, the Wise.",
    translationMalay: "Wahai Tuhan kami! Janganlah Engkau jadikan pendirian dan keyakinan kami terpesong kerana aniaya orang-orang kafir, dan ampunkanlah dosa kami wahai Tuhan kami; sesungguhnya Engkaulah jua Yang Maha Kuasa, lagi Maha Bijaksana.",
    reference: "60:5"
  },
  {
    id: 39,
    arabic: "رَبَّنَا أَتْمِمْ لَنَا نُورَنَا وَاغْفِرْ لَنَا ۖ إِنَّكَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "Rabbana atmim lana nurana waghfir lana innaka 'ala kulli shay'in qadir",
    translation: "Our Lord, perfect for us our light and forgive us. Indeed, You are over all things competent.",
    translationMalay: "Wahai Tuhan kami! Sempurnakanlah bagi kami cahaya kami, dan ampunkanlah dosa kami; sesungguhnya Engkau Maha Kuasa atas tiap-tiap sesuatu.",
    reference: "66:8"
  },
  {
    id: 40,
    arabic: "رَبَّنَا آمَنَّا فَاكْتُبْنَا مَعَ الشَّاهِدِينَ",
    transliteration: "Rabbana amanna faktubna ma'ash-shahidin",
    translation: "Our Lord, we have believed, so register us among the witnesses.",
    translationMalay: "Wahai Tuhan kami, kami telah beriman, oleh itu tetapkanlah kami bersama-sama orang-orang yang menjadi saksi (yang mengakui kebenaran-Mu).",
    reference: "5:83"
  }
];

const ALLAHUMMA_DUAS: Dua[] = [
  {
    id: 1,
    arabic: "اللَّهُمَّ اغْفِرْ لِي وَلِلْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ وَالْمُسْلِمِينَ وَالْمُسْلِمَاتِ",
    transliteration: "Allahummagh-fir li walil-mu'minina wal-mu'minati wal-muslimina wal-muslimat",
    translation: "O Allah, forgive me and the believing men and women and the Muslim men and women.",
    translationMalay: "Ya Allah, ampunilah aku dan seluruh kaum mukminin dan mukminat, serta muslimin dan muslimat.",
    reference: "Hadith"
  },
  {
    id: 2,
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا وَاسِعًا وَشِفَاءً مِنْ كُلِّ دَاءٍ",
    transliteration: "Allahumma inni as'aluka 'ilman nafi'an wa rizqan wasi'an wa shifa'an min kulli da'",
    translation: "O Allah, I ask You for beneficial knowledge, wide provision, and healing from every disease.",
    translationMalay: "Ya Allah, sesungguhnya aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang luas, dan kesembuhan dari segala penyakit.",
    reference: "Hadith"
  },
  {
    id: 3,
    arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
    transliteration: "Allahumma innaka 'afuwwun karimun tuhibbul-'afwa fa'fu 'anni",
    translation: "O Allah, You are Most Forgiving, Most Generous, You love forgiveness, so forgive me.",
    translationMalay: "Ya Allah, sesungguhnya Engkau Maha Pengampun lagi Maha Pemurah, Engkau menyukai keampunan, maka ampunilah aku.",
    reference: "Hadith"
  },
  {
    id: 4,
    arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
    transliteration: "Allahummak-fini bihalalika 'an haramika wa aghnini bifadlika 'amman siwak",
    translation: "O Allah, suffice me with what is lawful instead of what is forbidden, and make me independent of all others besides You by Your grace.",
    translationMalay: "Ya Allah, cukupkanlah aku dengan rezeki-Mu yang halal daripada yang haram, dan kayakanlah aku dengan kurniaan-Mu daripada bergantung kepada selain-Mu.",
    reference: "Hadith"
  },
  {
    id: 5,
    arabic: "اللَّهُمَّ أَجِرْنِي فِي مُصِيبَتِي وَأَخْلِفْ لِي خَيْرًا مِنْهَا",
    transliteration: "Allahumma ajirni fi musibati wa akhlif li khayran minha",
    translation: "O Allah, reward me in my affliction and compensate me with something better than it.",
    translationMalay: "Ya Allah, berilah aku pahala dalam musibahku ini dan gantikanlah untukku dengan yang lebih baik daripadanya.",
    reference: "Hadith"
  },
  {
    id: 6,
    arabic: "اللَّهُمَّ إِنَّا نَجْعَلُكَ فِي نُحُورِهِمْ وَنَعُوذُ بِكَ مِنْ شُرُورِهِمْ",
    transliteration: "Allahumma inna naj'aluka fi nuhurihim wa na'udhu bika min shururihim",
    translation: "O Allah, we place You before them and seek refuge in You from their evils.",
    translationMalay: "Ya Allah, sesungguhnya kami menjadikan Engkau sebagai penghadang di leher-leher mereka dan kami berlindung dengan-Mu daripada kejahatan mereka.",
    reference: "Hadith"
  },
  {
    id: 7,
    arabic: "اللَّهُمَّ بَارِكْ لَنَا فِي مَا أَعْطَيْتَنَا وَقِنَا شَرَّ مَا قَضَيْتَ فَإِنَّكَ تَقْضِي وَلَا يُقْضَى عَلَيْكَ",
    transliteration: "Allahumma barik lana fi ma a'taytana waqina sharra ma qadayta fa'innaka taqdi wala yuqda 'alayk",
    translation: "O Allah, bless us in what You have given us and protect us from the evil of what You have decreed, for You decree and none can decree against You.",
    translationMalay: "Ya Allah, berkatilah kami pada apa yang telah Engkau kurniakan kepada kami dan peliharalah kami dari kejahatan apa yang telah Engkau tetapkan, kerana sesungguhnya Engkaulah yang menetapkan dan tiada sesiapa yang dapat menetapkan sesuatu ke atas-Mu.",
    reference: "Hadith"
  },
  {
    id: 8,
    arabic: "اللَّهُمَّ أَعِنَّا عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
    transliteration: "Allahumma a'inna 'ala dhikrika wa shukrika wa husni 'ibadatik",
    translation: "O Allah, help us in remembering You, thanking You, and worshipping You in the best manner.",
    translationMalay: "Ya Allah, bantulah kami untuk sentiasa mengingati-Mu, bersyukur kepada-Mu, dan memperelokkan ibadah kami kepada-Mu.",
    reference: "Hadith"
  },
  {
    id: 9,
    arabic: "اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا وَلَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ فَاغْفِرْ لِي",
    transliteration: "Allahumma inni zalamtu nafsi zulman kathiran wala yaghfirudh-dhunuba illa anta faghfir li",
    translation: "O Allah, I have wronged myself greatly and none forgives sins except You, so forgive me.",
    translationMalay: "Ya Allah, sesungguhnya aku telah menzalimi diriku sendiri dengan kezaliman yang banyak, dan tiada yang dapat mengampunkan dosa melainkan Engkau, maka ampunilah aku.",
    reference: "Hadith"
  },
  {
    id: 10,
    arabic: "اللَّهُمَّ لَا تَقْتُلْنَا بِغَضَبِكَ وَلَا تُهْلِكْنَا بِعَذَابِكَ وَعَافِنَا قَبْلَ ذَلِكَ",
    transliteration: "Allahumma la taqtulna bighadabika wala tuhlikna bi'adhabika wa 'afina qabla dhalik",
    translation: "O Allah, do not kill us with Your anger, and do not destroy us with Your punishment, and grant us well-being before that.",
    translationMalay: "Ya Allah, janganlah Engkau membunuh kami dengan kemurkaan-Mu, dan janganlah Engkau membinasakan kami dengan azab-Mu, serta afiatkanlah kami sebelum itu.",
    reference: "Hadith"
  },
  {
    id: 11,
    arabic: "اللَّهُمَّ حَاسِبْنِي حِسَابًا يَسِيرًا",
    transliteration: "Allahumma hasibni hisaban yasira",
    translation: "O Allah, grant me an easy reckoning.",
    translationMalay: "Ya Allah, hitunglah amalku dengan hitungan yang mudah.",
    reference: "Hadith"
  },
  {
    id: 12,
    arabic: "اللَّهُمَّ أَجِرْنَا مِنَ النَّارِ",
    transliteration: "Allahumma ajirna minan-nar",
    translation: "O Allah, protect us from the Fire.",
    translationMalay: "Ya Allah, selamatkanlah kami daripada api neraka.",
    reference: "Hadith"
  },
  {
    id: 13,
    arabic: "اللَّهُمَّ بَارِكْ لِي فِي الْمَوْتِ وَفِي مَا بَعْدَ الْمَوْتِ",
    transliteration: "Allahumma barik li fil-mawti wa fi ma ba'dal-mawt",
    translation: "O Allah, bless me in death and in what comes after death.",
    translationMalay: "Ya Allah, berkatilah aku ketika mati dan pada apa yang berlaku selepas mati.",
    reference: "Hadith"
  },
  {
    id: 14,
    arabic: "اللَّهُمَّ ارْحَمْنِي بِتَرْكِ الْمَعَاصِي أَبَدًا مَا أَبْقَيْتَنِي",
    transliteration: "Allahummar-hamni bitarkil-ma'asi abadan ma abqaytani",
    translation: "O Allah, have mercy on me by enabling me to avoid sins as long as You keep me alive.",
    translationMalay: "Ya Allah, rahmatilah aku dengan meninggalkan maksiat selama-lamanya selagi Engkau mengekalkan aku (hidup).",
    reference: "Hadith"
  },
  {
    id: 15,
    arabic: "اللَّهُمَّ يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قُلُوبَنَا عَلَى دِينِكَ",
    transliteration: "Allahumma ya muqallibal-qulubi thabbit qulubana 'ala dinik",
    translation: "O Allah, O Turner of hearts, keep our hearts firm on Your religion.",
    translationMalay: "Ya Allah, wahai Tuhan yang membolak-balikkan hati, teguhkanlah hati kami di atas agama-Mu.",
    reference: "Hadith"
  },
  {
    id: 16,
    arabic: "اللَّهُمَّ بَارِكْ لَنَا فِي أَسْمَاعِنَا وَأَبْصَارِنَا وَقُلُوبِنَا وَفِي أَزْوَاجِنَا وَذُرِّيَّاتِنَا وَفِي مَا أَعْطَيْتَنَا",
    transliteration: "Allahumma barik lana fi asma'ina wa absarina wa qulubina wa fi azwajina wa dhurriyyatina wa fi ma a'taytana",
    translation: "O Allah, bless us in our hearing, our sight, our hearts, our spouses, our offspring, and in what You have given us.",
    translationMalay: "Ya Allah, berkatilah pendengaran kami, penglihatan kami, hati kami, pasangan kami, keturunan kami, dan apa yang telah Engkau kurniakan kepada kami.",
    reference: "Hadith"
  },
  {
    id: 17,
    arabic: "اللَّهُمَّ وَاجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ وَاجْعَلْنِي صَبُورًا وَشَكُورًا",
    transliteration: "Allahumma waj'alni minat-tawwabina waj'alni minal-mutatahhirina waj'alni saburan wa shakura",
    translation: "O Allah, make me among those who repent, make me among those who purify themselves, and make me patient and grateful.",
    translationMalay: "Ya Allah, jadikanlah aku dalam kalangan orang yang bertaubat, jadikanlah aku dalam kalangan orang yang menyucikan diri, dan jadikanlah aku seorang yang sabar serta bersyukur.",
    reference: "Hadith"
  },
  {
    id: 18,
    arabic: "اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَعَافِنِي وَاهْدِنِي وَارْزُقْنِي وَاجْبُرْنِي وَارْفَعْنِي",
    transliteration: "Allahummagh-fir li warhamni wa 'afini wahdini warzuqni wajburni warfa'ni",
    translation: "O Allah, forgive me, have mercy on me, grant me well-being, guide me, provide for me, console me, and elevate me.",
    translationMalay: "Ya Allah, ampunilah aku, rahmatilah aku, afiatkanlah aku, berilah petunjuk kepadaku, kurniakanlah rezeki kepadaku, cukupkanlah kekuranganku, dan tinggikanlah darajatku.",
    reference: "Hadith"
  },
  {
    id: 19,
    arabic: "اللَّهُمَّ يَسِّرْ لَنَا أُمُورَنَا وَطَهِّرْ لِسَانِي مِنَ الْمَعْصِيَةِ وَعَمَلِي مِنَ الرِّيَاءِ وَعَيْنِي مِنَ الْخِيَانَةِ وَقَلْبِي مِنَ النِّفَاقِ وَأَحْسِنْ عَاقِبَتَنَا فِي الْأُمُورِ كُلِّهَا",
    transliteration: "Allahumma yassir lana umurana wa tahhir lisani minal-ma'siyati wa 'amali minar-riya'i wa 'ayni minal-khiyanati wa qalbi minan-nifaqi wa ahsin 'aqibatana fil-umuri kulliha",
    translation: "O Allah, make our affairs easy for us, purify my tongue from sin, my deeds from showing off, my eyes from treachery, my heart from hypocrisy, and grant us a good end in all our affairs.",
    translationMalay: "Ya Allah, mudahkanlah urusan kami, sucikanlah lidahku daripada maksiat, amalku daripada riyak, mataku daripada khianat, hatiku daripada nifak, dan perelokkanlah kesudahan kami dalam segala urusan.",
    reference: "Hadith"
  },
  {
    id: 20,
    arabic: "اللَّهُمَّ اجْعَلْ أَوْسَعَ رِزْقِكَ عَلَيَّ عِنْدَ كِبَرِ سِنِّي وَانْقِطَاعِ عُمُرِي",
    transliteration: "Allahummaj-'al awsa'a rizqika 'alayya 'inda kibari sinni wanqita'i 'umuri",
    translation: "O Allah, make Your widest provision for me at the time of my old age and the end of my life.",
    translationMalay: "Ya Allah, jadikanlah rezeki-Mu yang paling luas buatku ketika usia tuaku dan di penghujung hayatku.",
    reference: "Hadith"
  },
  {
    id: 21,
    arabic: "اللَّهُمَّ عَافِنِي فِي بَدَنِي فِي سَمْعِي وَفِي بَصَرِي وَعَافِنَا فِي مَنْ عَافَيْتَ",
    transliteration: "Allahumma 'afini fi badani fi sam'i wa fi basari wa 'afina fi man 'afayt",
    translation: "O Allah, grant me well-being in my body, my hearing, and my sight, and grant us well-being among those You have granted well-being.",
    translationMalay: "Ya Allah, afiatkanlah badanku, afiatkanlah pendengaranku, afiatkanlah penglihatanku, dan afiatkanlah kami bersama orang-orang yang telah Engkau afiatkan.",
    reference: "Hadith"
  },
  {
    id: 22,
    arabic: "اللَّهُمَّ أَغْنِنِي بِالْعِلْمِ وَزَيِّنِّي بِالْحِلْمِ وَأَكْرِمْنِي بِالتَّقْوَى",
    transliteration: "Allahumma aghnini bil-'ilmi wa zayyinni bil-hilmi wa akrimni bittaqwa",
    translation: "O Allah, enrich me with knowledge, beautify me with forbearance, and honor me with piety.",
    translationMalay: "Ya Allah, kayakanlah aku dengan ilmu, hiasilah aku dengan sifat santun, dan muliakanlah aku dengan takwa.",
    reference: "Hadith"
  },
  {
    id: 23,
    arabic: "اللَّهُمَّ أَلِّفْ بَيْنَ قُلُوبِنَا وَأَصْلِحْ ذَاتَ بَيْنِنَا",
    transliteration: "Allahumma allif bayna qulubina wa aslih dhata baynina",
    translation: "O Allah, join our hearts together and reconcile our differences.",
    translationMalay: "Ya Allah, jinakkanlah antara hati-hati kami dan damaikanlah perselisihan di antara kami.",
    reference: "Hadith"
  },
  {
    id: 24,
    arabic: "اللَّهُمَّ زِدْنَا وَلَا تَنْقُصْنَا وَأَكْرِمْنَا وَلَا تُهِنَّا وَأَعْطِنَا وَلَا تَحْرِمْنَا وَآثِرْنَا وَلَا تُؤْثِرْ عَلَيْنَا وَأَرْضِنَا وَارْضَ عَنَّا",
    transliteration: "Allahumma zidna wala tanqusna wa akrimna wala tuhinna wa a'tina wala tahrimna wa athirna wala tu'thir 'alayna wa ardina warda 'anna",
    translation: "O Allah, increase us and do not decrease us, honor us and do not humiliate us, give us and do not deprive us, prefer us and do not prefer others over us, make us pleased and be pleased with us.",
    translationMalay: "Ya Allah, tambahkanlah buat kami dan janganlah Engkau kurangkan, muliakanlah kami dan janganlah Engkau hinakan, berilah kami dan janganlah Engkau halangi, utamakanlah kami dan janganlah Engkau melebihkan orang lain ke atas kami, jadikanlah kami redha dan redhalah ke atas kami.",
    reference: "Hadith"
  },
  {
    id: 25,
    arabic: "اللَّهُمَّ أَلْهِمْنَا رُشْدَنَا وَأَجِرْنَا مِنْ خِزْيِ الدُّنْيَا وَاسْتُرْ عَوْرَاتِنَا وَآمِنْ رَوْعَاتِنَا",
    transliteration: "Allahumma alhimna rushdana wa ajirna min khizyid-dunya wastur 'awratina wa amin raw'atina",
    translation: "O Allah, inspire us with our guidance, protect us from the disgrace of this world, cover our faults, and calm our fears.",
    translationMalay: "Ya Allah, ilhamkanlah kepada kami petunjuk kami, selamatkanlah kami daripada kehinaan dunia, tutuplah keaiban kami, dan tenteramkanlah ketakutan kami.",
    reference: "Hadith"
  },
  {
    id: 26,
    arabic: "اللَّهُمَّ حَبِّبْ إِلَيْنَا الْإِيمَانَ وَزَيِّنْهُ فِي قُلُوبِنَا",
    transliteration: "Allahumma habbib ilaynal-imana wa zayyinhu fi qulubina",
    translation: "O Allah, make faith beloved to us and beautify it in our hearts.",
    translationMalay: "Ya Allah, cintakanlah iman kepada kami dan hiasilah ia di dalam hati kami.",
    reference: "Hadith"
  },
  {
    id: 27,
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى وَشُكْرَ نِعْمَتِكَ وَحُسْنَ عِبَادَتِكَ",
    transliteration: "Allahumma inni as'alukal-huda wat-tuqa wal-'afafa wal-ghina wa shukra ni'matika wa husni 'ibadatik",
    translation: "O Allah, I ask You for guidance, piety, chastity, sufficiency, gratitude for Your blessings, and excellence in Your worship.",
    translationMalay: "Ya Allah, sesungguhnya aku memohon kepada-Mu petunjuk, ketakwaan, sifat iffah (menjaga kehormatan), kecukupan, kesyukuran atas nikmat-Mu, dan keelokan ibadah kepada-Mu.",
    reference: "Hadith"
  },
  {
    id: 28,
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ لِسَانًا صَادِقًا وَقَلْبًا سَلِيمًا وَخُلُقًا مُسْتَقِيمًا وَالثَّبَاتَ فِي الْأَمْرِ وَفِعْلَ الْخَيْرَاتِ وَتَرْكَ الْمُنْكَرَاتِ وَإِيمَانًا لَا يَرْتَدُّ وَنَعِيمًا لَا يَنْفَدُ",
    transliteration: "Allahumma inni as'aluka lisanan sadiqan wa qalban saliman wa khuluqan mustaqiman wath-thabata fil-amri wa fi'lal-khayrati wa tarkal-munkarati wa imanan la yartaddu wa na'iman la yanfad",
    translation: "O Allah, I ask You for a truthful tongue, a sound heart, upright character, firmness in the matter, the doing of good deeds, the abandoning of evil deeds, faith that does not waver, and bliss that never ends.",
    translationMalay: "Ya Allah, sesungguhnya aku memohon kepada-Mu lidah yang benar, hati yang sejahtera, akhlak yang lurus, ketetapan dalam urusan, melakukan kebaikan, meninggalkan kemungkaran, iman yang tidak berbolak-balik, dan nikmat yang tidak kunjung habis.",
    reference: "Hadith"
  },
  {
    id: 29,
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنَ الْخَيْرِ كُلِّهِ عَاجِلِهِ وَآجِلِهِ وَفُجَاءَةِ الْخَيْرِ",
    transliteration: "Allahumma inni as'aluka minal-khayri kullihi 'ajilihi wa ajilihi wa fuja'atil-khayr",
    translation: "O Allah, I ask You for all good, both immediate and delayed, and for unexpected good.",
    translationMalay: "Ya Allah, sesungguhnya aku memohon kepada-Mu segala kebaikan, yang segera mahupun yang tertunda, dan kebaikan yang datang secara tiba-tiba.",
    reference: "Hadith"
  },
  {
    id: 30,
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الدُّنْيَا وَالْآخِرَةِ وَفَضْلِكَ وَرَحْمَتِكَ",
    transliteration: "Allahumma inni as'aluka khayrad-dunya wal-akhirati wa fadlika wa rahmatik",
    translation: "O Allah, I ask You for the good of this world and the Hereafter, and for Your grace and Your mercy.",
    translationMalay: "Ya Allah, sesungguhnya aku memohon kepada-Mu kebaikan dunia dan akhirat, serta kurniaan-Mu dan rahmat-Mu.",
    reference: "Hadith"
  },
  {
    id: 31,
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ",
    transliteration: "Allahumma inni as'alukal-'afwa wal-'afiyata fid-dunya wal-akhirah",
    translation: "O Allah, I ask You for forgiveness and well-being in this world and the Hereafter.",
    translationMalay: "Ya Allah, sesungguhnya aku memohon kepada-Mu keampunan dan afiat (kesejahteraan) di dunia dan di akhirat.",
    reference: "Hadith"
  },
  {
    id: 32,
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ إِيمَانًا دَائِمًا وَقَلْبًا خَاشِعًا وَيَقِينًا صَادِقًا وَدِينًا قَيِّمًا وَخَيْرَ الدُّعَاءِ وَخَيْرَ الْعَمَلِ",
    transliteration: "Allahumma inni as'aluka imanan da'iman wa qalban khashi'an wa yaqinan sadiqan wa dinan qayyiman wa khayrad-du'a'i wa khayral-'amal",
    translation: "O Allah, I ask You for permanent faith, a humble heart, truthful certainty, an upright religion, the best of supplication, and the best of deeds.",
    translationMalay: "Ya Allah, sesungguhnya aku memohon kepada-Mu iman yang kekal, hati yang khusyuk, keyakinan yang benar, agama yang lurus, sebaik-baik doa, dan sebaik-baik amal.",
    reference: "Hadith"
  },
  {
    id: 33,
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لَا يَنْفَعُ وَقَلْبٍ لَا يَخْشَعُ وَدُعَاءٍ لَا يُسْمَعُ وَنَفْسٍ لَا تَشْبَعُ وَالشَّرِّ كُلِّهِ مَا عَلِمْتُ مِنْهُ وَمَا لَمْ أَعْلَمْ",
    transliteration: "Allahumma inni au'dhu bika min 'ilmin la yanfa'u wa qalbin la yakhsha'u wa du'a'in la yusma'u wa nafsin la tashba'u wash-sharri kullihi ma 'alimtu minhu wa ma lam a'lam",
    translation: "O Allah, I seek refuge in You from knowledge that does not benefit, a heart that is not humble, a supplication that is not heard, a soul that is never satisfied, and from all evil, that which I know and that which I do not know.",
    translationMalay: "Ya Allah, sesungguhnya aku berlindung dengan-Mu daripada ilmu yang tidak bermanfaat, hati yang tidak khusyuk, doa yang tidak didengari, nafsu yang tidak pernah kenyang, dan daripada segala kejahatan, yang aku ketahui mahupun yang tidak aku ketahui.",
    reference: "Hadith"
  },
  {
    id: 34,
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالشِّرْكِ وَالْكِذْبِ وَالْغَيْبَةِ وَالنَّمِيمَةِ وَالْفَوَاحِشِ وَالْبُهْتَانِ وَالْمَعَاصِي كُلِّهَا وَالنِّفَاقِ وَالشِّقَاقِ وَسُوءِ الْأَخْلَاقِ",
    transliteration: "Allahumma inni au'dhu bika minal-kufri wash-shirki wal-kidhbi wal-ghaybati wan-namimati wal-fawahishi wal-buhtani wal-ma'asi kulliha wan-nifaqi wash-shiqaqi wa su'il-akhlaq",
    translation: "O Allah, I seek refuge in You from disbelief, polytheism, lying, backbiting, slandering, lewdness, false accusation, all sins, hypocrisy, discord, and bad character.",
    translationMalay: "Ya Allah, sesungguhnya aku berlindung dengan-Mu daripada kekufuran, syirik, dusta, mengumpat, mengadu domba, perbuatan keji, fitnah, segala maksiat, nifak, perpecahan, dan akhlak yang buruk.",
    reference: "Hadith"
  },
  {
    id: 35,
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ زَوَالِ نِعْمَتِكَ وَفُجَاءَةِ نِقْمَتِكَ وَجَمِيعِ سَخَطِكَ",
    transliteration: "Allahumma inni au'dhu bika min zawali ni'matika wa fuja'ati niqmatika wa jami'i sakhatik",
    translation: "O Allah, I seek refuge in You from the withdrawal of Your blessing, the suddenness of Your punishment, and all Your displeasure.",
    translationMalay: "Ya Allah, sesungguhnya aku berlindung dengan-Mu daripada hilangnya nikmat-Mu, datangnya azab-Mu secara tiba-tiba, dan segala kemurkaan-Mu.",
    reference: "Hadith"
  },
  {
    id: 36,
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ جَهْدِ الْبَلَاءِ وَدَرَكِ الشَّقَاءِ وَسُوءِ الْقَضَاءِ وَشَمَاتَةِ الْأَعْدَاءِ وَمَالٍ يَكُونُ عَلَيَّ عَذَابًا",
    transliteration: "Allahumma inni au'dhu bika min jahdil-bala'i wa darakish-shaqa'i wa su'il-qada'i wa shamatatil-a'da'i wa malin yakunu 'alayya 'adhaba",
    translation: "O Allah, I seek refuge in You from the severity of affliction, the depth of misery, the evil of decree, the gloating of enemies, and wealth that becomes a punishment for me.",
    translationMalay: "Ya Allah, sesungguhnya aku berlindung dengan-Mu daripada bebanan ujian, hinanya kesengsaraan, buruknya takdir, kegembiraan musuh (atas penderitaanku), dan harta yang menjadi azab ke atasku.",
    reference: "Hadith"
  },
  {
    id: 37,
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ وَالْجُبْنِ وَالْبُخْلِ وَالذِّلَّةِ وَالْمَسْكَنَةِ وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الدَّيْنِ وَالْفَقْرِ وَقَهْرِ الرِّجَالِ وَفِتْنَةِ الْمَسِيحِ الدَّجَّالِ",
    transliteration: "Allahumma inni au'dhu bika minal-hammi wal-hazani wal-'ajzi wal-kasali wal-jubni wal-bukhli wadh-dhillati wal-maskanati wa dala'id-dayni wa ghalabatid-dayni wal-faqri wa qahrir-rijali wa fitnatil-masihid-dajjal",
    translation: "O Allah, I seek refuge in You from anxiety, sorrow, weakness, laziness, cowardice, stinginess, humiliation, poverty, the burden of debt, being overpowered by debt, poverty, the oppression of men, and the trial of the False Messiah.",
    translationMalay: "Ya Allah, sesungguhnya aku berlindung dengan-Mu daripada kegelisahan, kesedihan, kelemahan, kemalasan, sifat penakut, bakhil, kehinaan, kemiskinan, bebanan hutang, kekalahan hutang, kefakiran, penindasan manusia, dan fitnah Al-Masih Ad-Dajjal.",
    reference: "Hadith"
  },
  {
    id: 38,
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أُشْرِكَ بِكَ شَيْئًا",
    transliteration: "Allahumma inni au'dhu bika an ushrika bika shay'a",
    translation: "O Allah, I seek refuge in You from associating anything with You.",
    translationMalay: "Ya Allah, sesungguhnya aku berlindung dengan-Mu daripada mensyirikkan Engkau dengan sesuatu.",
    reference: "Hadith"
  },
  {
    id: 39,
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ قَلْبِي وَمِنْ شَرِّ سَمْعِي وَبَصَرِي وَلِسَانِي وَمِنْكَرَاتِ الْأَعْمَالِ وَالْأَهْوَاءِ",
    transliteration: "Allahumma inni au'dhu bika min sharri nafsi wa min sharri qalbi wa min sharri sam'i wa basari wa lisani wa munkaratil-a'mali wal-ahwa'",
    translation: "O Allah, I seek refuge in You from the evil of my soul, my heart, my hearing, my sight, my tongue, and from evil deeds and desires.",
    translationMalay: "Ya Allah, sesungguhnya aku berlindung dengan-Mu daripada kejahatan diriku, hatiku, pendengaranku, penglihatanku, lidahku, serta daripada amal yang mungkar dan hawa nafsu.",
    reference: "Hadith"
  },
  {
    id: 40,
    arabic: "اللَّهُمَّ إِنَّا نَسْأَلُكَ مِنْ خَيْرِ مَا سَأَلَكَ مِنْهُ نَبِيُّكَ مُحَمَّدٌ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ وَنَعُوذُ بِكَ مِنْ شَرِّ مَا اسْتَعَاذَ مِنْهُ نَبِيُّكَ مُحَمَّدٌ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ وَأَنْتَ الْمُسْتَعَانُ وَعَلَيْكَ الْبَلَاغُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    transliteration: "Allahumma inna nas'aluka min khayri ma sa'alaka minhu nabiyyuka muhammadun sallallahu 'alayhi wasallama wa na'udhu bika min sharri masta'adha minhu nabiyyuka muhammadun sallallahu 'alayhi wasallama wa antal-musta'anu wa 'alaykal-balaghu wala hawla wala quwwata illa billah",
    translation: "O Allah, we ask You for the best of what Your Prophet Muhammad (peace be upon him) asked You for, and we seek refuge in You from the evil of what Your Prophet Muhammad (peace be upon him) sought refuge from. You are the one whose help is sought, and to You is the delivery (of the message), and there is no power or might except with Allah.",
    translationMalay: "Ya Allah, sesungguhnya kami memohon kepada-Mu kebaikan sebagaimana yang dipohon oleh Nabi-Mu Muhammad SAW, dan kami berlindung dengan-Mu daripada keburukan sebagaimana yang Nabi-Mu Muhammad SAW mohon perlindungan. Engkaulah tempat meminta pertolongan, dan bagi-Mu jualah penyampaian (segala hajat), dan tiada daya serta kekuatan melainkan dengan Allah.",
    reference: "Hadith"
  },
  {
    id: 41,
    arabic: "بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ. الْحَمْدُ ِللهِ رَبِّ الْعَالَمِينَ، وَالصَّلوٰةُ وَالسَّلَامُ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى أٰلِهِ وَصَحْبِهِ أَجْمَعِينَ، اللَّهُمَّ اجْعَلْنَا بِالْإِيْمَانِ كَامِلِيْنَ، وَلِلْفَرَآئِضِ مُؤَدِّيْنَ، وَلِلصَّلاَةِ حَافِظِيْنَ، وَلِلزَّكَاةِ فَاعِلِيْنَ، وَلِمَا عِنْدَكَ طَالِبِيْنَ، وَلِعَفْوِكَ رَاجِيْنَ، وَبِالْهُدَى مُتَمَسِّكِيْنَ، وَعَنِ اللَّغْوِ مُعْرِضِيْنَ، وَفِي الدُّنْيَا زَاهِدِيْنَ، وَفِي الْأٰخِرَةِ رَاغِبِيْنَ، وَبِالْقَضَاءِ رَاضِيْنَ، وَبِالنَّعْمَآءِ شَاكِرِيْنَ، وَعَلَى الْبَلَايَا صَابِرِيْنَ، وَتَحْتَ لِوَاءِ سَيِّدِنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ يَوْمَ الْقِيَامَةِ سَائِرِيْنَ وَإِلَى الْحَوْضِ وَارِدِيْنَ، وَفِي الْجَنَّةِ دَاخِلِيْنَ، وَعَلَى سَرِيْرَةِ الْكَرَامَةِ قَاعِدِيْنَ، وَبِحُوْرٍ عِيْنٍ مُتَزَوِّجِيْنَ، وَمِنْ سُنْدُسٍ وَإِسْتَبْرَقٍ وَدِيْبَاجٍ مُتَلَبِّسِيْنَ، وَمِنْ طَعَامِ الْجَنَّةِ آكِلِيْنَ، وَمِنْ لَبَنٍ وَعَسَلٍ مُصَفَّيْنَ شَارِبِيْنَ، بِأَكْوَابٍ وَأَبَارِيْقَ وَكَأْسٍ مِنْ مَعِيْنٍ، مَعَ الَّذِيْنَ أَنْعَمْتَ عَلَيْهِمْ مِنَ النَّبِيِّيْنَ وَالصِّدِّيْقِيْنَ وَالشُّهَدَاءِ وَالصَّالِحِيْنَ. اللَّهُمَّ اجْعَلْنَا فِي هٰذِهِ اللَّيْلَةِ الشَّهْرِ الشَّرِيْفَةِ الْمُبَارَكَةِ مِنَ السُّعَدَاءِ الْمَقْبُوْلِيْنَ، وَلَا تَجْعَلْنَا اللَّهُمَّ مِنَ الْأَشْقِيَاءِ الْمَرْدُوْدِيْنَ. إِلٰهَنَا عَافِنَا وَاعْفُ عَنَّا وَاغْفِرْ اَللّٰهُمَّ لَنَا وَلِوَالِدِيْنَا وَلِأُمَّهَاتِنَا وَلِإِخْوَانِنَا وَلِأَخَوَاتِنَا وَلِأَزْوَاجِنَا وَلِأَهْلِيْنَا وَلِأَهْلِ بَيْتِنَا وَلِأَجْدَادِنَا وَلِجَدَّاتِنَا وَلِمَشَايِخِنَا وَلِمُعَلِّمِيْنَا وَلِجَمِيْعِ الْمُسْلِمِيْنَ وَالْمُسْلِمَاتِ وَالْمُؤْمِنِيْنَ وَالْمُؤْمِنَاتِ، الْأَحْيَآءِ مِنْهُمْ وَالْأَمْوَاتِ. وَاكْتُبِ اللَّهُمَّ السَّلَامَةَ وَالْعَافِيَةَ عَلَيْنَا وَعَلَى عَبِيْدِكَ الْحُجَّاجِ وَالْغُزَاةِ وَالزُّوَّارِ وَالْمُسَافِرِيْنَ وَالْمُقِيْمِيْنَ فِي الْبَرِّ وَالْبَحْرِ مِنَ الْمُسْلِمِيْنَ. وَقِنَا شَرَّ الظَّالِمِيْنَ، وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِيْنَ، يَا مُجِيْبَ السَّآئِلِيْنَ، وَاخْتِمْ لَنَا يَا رَبَّنَا مِنْكَ بِخَيْرٍ يَا أَرْحَمَ الرَّاحِمِيْنَ. وَصَلَّى اللهُ عَلَى خَيْرِ خَلْقِهِ مُحَمَّدٍ وَعَلَى أٰلِهِ وَصَحْبِهِ وَسَلَّمَ، وَالْحَمْدُ ِللهِ رَبِّ الْعَالَمِينَ.",
    transliteration: "Bismillahir-rahmanir-rahim. Alhamdu lillahi rabbil-'alamin, was-salatu was-salamu 'ala sayyidina Muhammadin wa 'ala alihi wasahbihi ajma'in. Allahummaj'alna bil-imani kamilin, wa lil-fara'idi mu'addin, wa lis-salati hafizin, wa liz-zakati fa'ilin, wa lima 'indaka talibin, wa li'afwika rajin, wa bil-huda mutamassikin, wa 'anil-laghwi mu'ridin, wa fid-dunya zahidin, wa fil-akhirati raghibin, wa bil-qada'i radin, wa bin-na'ma'i shakirin, wa 'alal-balaya sabirin, wa tahta liwa'i sayyidina Muhammadin sallallahu 'alayhi wasallama yawmal-qiyamati sa'irin, wa ilal-hawdi waridin, wa fil-jannati dakhilin, wa 'ala sariratil-karamati qa'idin, wa bihurin 'inin mutazawwijin, wa min sundusin wa istabraqin wa dibajin mutalabbisin, wa min ta'amil-jannati akilin, wa min labanin wa 'asalin musaffayn sharibin, bi'akwabin wa abariqa wakas'in min ma'in, ma'al-ladhina an'amta 'alayhim minan-nabiyyina was-siddiqina wash-shuhada'i was-salihin. Allahummaj'alna fi hadhihil-laylatish-shahrish-sharifatil-mubarakati minas-su'ada'il-maqbulin, wala taj'alna allahumma minal-ashqiya'il-mardudin. Ilahana 'afina wa'fu 'anna waghfir allahumma lana wa liwalidina wa li'ummahatina wa li'ikhwanina wa li'akhawatina wa li'azwajina wa li'ahlina wa li'ahli baytina wa li'ajdadina wa lijaddatina wa limashayikhina wa limu'allimina wa lijami'il-muslimina wal-muslimati wal-mu'minina wal-mu'minat, al-ahya'i minhum wal-amwat. Waktub allahummas-salamata wal-'afiyata 'alayna wa 'ala 'abidikal-hujjaji wal-ghuzati waz-zuwwari wal-musafirina wal-muqimina fil-barri wal-bahri minal-muslimin. Waqina sharrz-zalimin, wansurna 'alal-qawmil-kafirin, ya mujibas-sa'ilin, wakhtim lana ya rabbana minka bikhayrin ya arhamar-rahimin. Wa sallallahu 'ala khayri khalqihi Muhammadin wa 'ala alihi wa sahbihi wa sallam, wal-hamdu lillahi rabbil-'alamin.",
    translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful. Praise be to Allah, Lord of the worlds, and peace and blessings be upon our master Muhammad, and upon all his family and companions. O Allah, make us of those who are perfect in faith, who perform the religious obligations, who guard their prayers, who pay the zakat, who seek what is with You, who hope for Your forgiveness, who hold fast to guidance, who turn away from idle talk, who are ascetic in this world, who desire the Hereafter, who are content with the divine decree, who are thankful for blessings, who are patient under trials, who will march under the banner of our master Muhammad (peace be upon him) on the Day of Resurrection, who will arrive at the Pond, who will enter Paradise, who will sit on the thrones of honor, who will be married to the Houris with wide beautiful eyes, who will be clothed in fine silk, heavy silk, and brocade, who will eat from the food of Paradise, who will drink from clarified milk and honey in cups, pitchers, and a glass from a flowing spring, along with those upon whom You have bestowed favor of the prophets, the steadfast affirmers of truth, the martyrs, and the righteous. O Allah, make us in this noble, blessed night of the month among the felicitous and accepted ones, and do not make us, O Allah, among the wretched and rejected ones. Our God, grant us well-being, pardon us, and forgive, O Allah, us, our fathers, our mothers, our brothers, our sisters, our spouses, our families, the people of our households, our grandfathers, our grandmothers, our scholars, our teachers, and all the Muslim men and women, and the believing men and women, the living among them and the dead. And decree, O Allah, safety and well-being for us and for Your servants, the pilgrims, the warriors, the visitors, the travelers, and the residents in the land and the sea among the Muslims. And protect us from the evil of the wrongdoers, and give us victory over the disbelieving people, O Responder to those who ask. And seal for us, O our Lord, from You with good, O Most Merciful of the merciful. And may Allah send blessings upon the best of His creation, Muhammad, and upon his family and companions, and grant them peace. And praise be to Allah, Lord of the worlds.",
    translationMalay: "Dengan nama Allah, Yang Maha Pemurah, lagi Maha Mengasihani. Segala puji bagi Allah, Tuhan sekalian alam, dan selawat serta salam ke atas junjungan besar Nabi Muhammad, dan ke atas keluarga serta sahabat baginda sekalian. Ya Allah, jadikanlah kami orang-orang yang sempurna imannya, yang menunaikan segala fardu, yang memelihara solat, yang mengeluarkan zakat, yang menuntut apa yang ada di sisi-Mu, yang mengharapkan keampunan-Mu, yang berpegang teguh kepada petunjuk, yang berpaling daripada perkara sia-sia, yang zuhud di dunia, yang merindui akhirat, yang reda dengan qada' (ketentuan), yang bersyukur atas segala nikmat, yang sabar menghadapi bala bencana, yang bernaung di bawah panji-panji junjungan kita Nabi Muhammad SAW pada hari kiamat, yang sampai ke telaga (Kautsar), yang masuk ke dalam syurga, yang duduk di atas takhta kehormatan, yang dikahwinkan dengan bidadari, yang memakai pakaian sutera halus, sutera tebal dan sutera dewangga, yang memakan makanan syurga, yang meminum susu dan madu yang disaring dari gelas, cerek, dan piala berisi minuman dari mata air yang mengalir, bersama-sama orang-orang yang telah Engkau kurniakan nikmat kepada mereka daripada kalangan para nabi, siddiqin, syuhada, dan orang-orang yang soleh. Ya Allah, jadikanlah kami pada malam bulan yang mulia dan berkat ini dalam kalangan orang-orang yang bertuah dan diterima, dan janganlah Engkau jadikan kami, ya Allah, dalam kalangan orang-orang yang celaka dan ditolak. Ya Tuhan kami, kurniakanlah kami afiat, maafkanlah kami, dan ampunilah, ya Allah, dosa kami, ibu bapa kami, ibu-ibu kami, saudara mara lelaki kami, saudara mara perempuan kami, isteri-isteri/suami-suami kami, keluarga kami, ahli rumah kami, datuk-datuk kami, nenek-nenek kami, para syeikh kami, guru-guru kami, dan seluruh kaum muslimin dan muslimat, mukminin dan mukminat, yang masih hidup mahupun yang telah meninggal dunia. Dan catatkanlah, ya Allah, keselamatan dan kesejahteraan ke atas kami dan ke atas hamba-hamba-Mu yang menunaikan haji, yang berperang (di jalan Allah), yang berkunjung, yang bermusafir, dan yang bermukim di darat dan di laut daripada kalangan umat Islam. Dan peliharalah kami daripada kejahatan orang-orang yang zalim, dan tolonglah kami mengalahkan kaum yang kafir, wahai Tuhan Yang Memperkenankan permohonan yang meminta. Dan akhirilah (hidup) kami, ya Tuhan kami, daripada-Mu dengan kebaikan, wahai Tuhan Yang Maha Pemurah lagi Maha Mengasihani. Dan semoga Allah melimpahkan selawat ke atas sebaik-baik makhluk-Nya, Muhammad, serta kaum keluarga dan para sahabat baginda, dan kurniakanlah kesejahteraan. Segala puji bagi Allah, Tuhan sekalian alam.",
    reference: "Doa Kamilin",
    videoUrl: "https://youtu.be/d67YBlPAOZM?si=Nv_5Xw8dLhN1GKeF"
  },
  {
    id: 42,
    arabic: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ. اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ قَيِّمُ السَّمَاوَاتِ وَالْأَرْضِ وَمَنْ فِيهِنَّ، وَلَكَ الْحَمْدُ لَكَ مُلْكُ السَّمَاوَاتِ وَالْأَرْضِ وَمَنْ فِيهِنَّ، وَلَكَ الْحَمْدُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ، وَلَكَ الْحَمْدُ أَنْتَ الْحَقُّ وَوَعْدُكَ الْحَقُّ وَلِقَاؤُكَ حَقٌّ وَقَوْلُكَ حَقٌّ وَالْجَنَّةُ حَقٌّ وَالنَّارُ حَقٌّ، وَالنَّبِيُّونَ حَقٌّ وَمُحَمَّدٌ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ حَقٌّ، وَالسَّاعَةُ حَقٌّ. اللَّهُمَّ لَكَ أَسْلَمْتُ، وَبِكَ آمَنْتُ، وَعَلَيْكَ تَوَكَّلْتُ، وَإِلَيْكَ أَنَبْتُ، وَبِكَ خَاصَمْتُ، وَإِلَيْكَ حَاكَمْتُ، فَاغْفِرْ لِي مَا قَدَّمْتُ وَمَا أَخَّرْتُ، وَمَا أَسْرَرْتُ وَمَا أَعْلَنْتُ، أَنْتَ الْمُقَدِّمُ وَأَنْتَ الْمُؤَخِّرُ، لَا إِلَهَ إِلَّا أَنْتَ",
    transliteration: "Bismillahir-rahmanir-rahim. Allahumma lakal-hamdu anta qayyimus-samawati wal-ardi wa man fihinna, wa lakal-hamdu laka mulkus-samawati wal-ardi wa man fihinna, wa lakal-hamdu nurus-samawati wal-ardi. Wa lakal-hamdu antal-haqqu wa wa'dukal-haqqu wa liqa'uka haqqun wa qawluka haqqun wal-jannatu haqqun wan-naru haqqun, wan-nabiyyuna haqqun wa Muhammadun sallallahu 'alayhi wasallama haqqun, was-sa'atu haqqun. Allahumma laka aslamtu, wa bika amantu, wa 'alayka tawakkaltu, wa ilayka anabtu, wa bika khasumtu, wa ilayka hakamtu, faghfir li ma qaddamtu wa ma akhkhartu, wa ma asrartu wa ma a'lantu, antal-muqaddimu wa antal-mu'akhkhiru, la ilaha illa anta.",
    translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful. O Allah! All the praises are for You, You are the Sustainer of the Heavens and the Earth, and whatever is in them. All the praises are for You; You are the Sovereign of the Heavens and the Earth, and whatever is in them. All the praises are for You; You are the Light of the Heavens and the Earth. And all the praises are for You; You are the Truth, Your promise is the truth, the meeting with You is the truth, Your word is the truth, Paradise is the truth, Hellfire is the truth, the Prophets are the truth, Muhammad (peace be upon him) is the truth, and the Hour is the truth. O Allah! I surrender to You, I believe in You, I depend on You, I repent to You, with Your help I argue, and I take You as a judge. Please forgive me my previous and future sins, what I have hidden and what I have declared. You are the Expediter and You are the Delayer. There is no deity worthy of worship but You.",
    translationMalay: "Dengan nama Allah, Yang Maha Pemurah, lagi Maha Mengasihani. Ya Allah! Segala puji bagi-Mu, Engkaulah penguasa langit dan bumi serta segala isinya. Segala puji bagi-Mu, bagi-Mu kerajaan langit dan bumi serta segala isinya. Segala puji bagi-Mu, Engkaulah cahaya langit dan bumi. Segala puji bagi-Mu, Engkau adalah Maha Benar, janji-Mu adalah benar, pertemuan dengan-Mu adalah benar, firman-Mu adalah benar, syurga adalah benar, neraka adalah benar, para nabi adalah benar, Muhammad SAW adalah benar, dan hari kiamat adalah benar. Ya Allah! Kepada-Mu aku berserah diri, kepada-Mu aku beriman, kepada-Mu aku bertawakkal, kepada-Mu aku bertaubat, dengan (hujah)-Mu aku berdebat, dan kepada-Mu aku berhukum. Maka ampunilah dosaku yang telah lalu dan yang akan datang, yang aku sembunyikan dan yang aku nyatakan. Engkaulah yang mendahulukan dan Engkaulah yang mengakhirkan. Tiada Tuhan yang berhak disembah melainkan Engkau.",
    reference: "Doa Tahajjud (Bukhari & Muslim)",
    videoUrl: "https://www.youtube.com/embed/d67YBlPAOZM?si=U69iP9jbESUsk1fH"
  }
];

export async function getAllahummaDuas(): Promise<Dua[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'allahumma_duas'));
    if (!querySnapshot.empty) {
      const duas = querySnapshot.docs.map(doc => ({ id: Number(doc.id), ...doc.data() } as Dua));
      return duas.sort((a, b) => a.id - b.id);
    }
  } catch (error) {
    console.error("Error fetching from Firebase:", error);
  }
  return ALLAHUMMA_DUAS;
}

export async function getDuaAudio(text: string): Promise<string | null> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Recite this Arabic prayer clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // The Gemini TTS returns raw PCM data (16-bit, Mono, 24kHz).
      // We need to wrap it in a WAV header so the browser's Audio object can play it.
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);

      /* RIFF identifier */
      view.setUint32(0, 0x52494646, false); // "RIFF"
      /* file length */
      view.setUint32(4, 36 + len, true);
      /* RIFF type */
      view.setUint32(8, 0x57415645, false); // "WAVE"
      /* format chunk identifier */
      view.setUint32(12, 0x666d7420, false); // "fmt "
      /* format chunk length */
      view.setUint32(16, 16, true);
      /* sample format (raw) */
      view.setUint16(20, 1, true);
      /* channel count */
      view.setUint16(22, 1, true);
      /* sample rate */
      view.setUint32(24, 24000, true);
      /* byte rate (sample rate * block align) */
      view.setUint32(28, 24000 * 2, true);
      /* block align (channel count * bytes per sample) */
      view.setUint16(32, 2, true);
      /* bits per sample */
      view.setUint16(34, 16, true);
      /* data chunk identifier */
      view.setUint32(36, 0x64617461, false); // "data"
      /* data chunk length */
      view.setUint32(40, len, true);

      const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (e) {
    console.error("Failed to generate audio:", e);
    return null;
  }
}

export async function getRabbanaDuas(): Promise<Dua[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'rabbana_duas'));
    if (!querySnapshot.empty) {
      const duas = querySnapshot.docs.map(doc => ({ id: Number(doc.id), ...doc.data() } as Dua));
      return duas.sort((a, b) => a.id - b.id);
    }
  } catch (error) {
    console.error("Error fetching from Firebase:", error);
  }
  return RABBANA_DUAS;
}

export async function migrateToFirebase() {
  console.log("Starting Firebase migration...");
  try {
    const rabbanaCol = collection(db, 'rabbana_duas');
    for (const dua of RABBANA_DUAS) {
      await setDoc(doc(rabbanaCol, String(dua.id)), dua);
    }
    console.log("Rabbana Duas migrated!");

    const allahummaCol = collection(db, 'allahumma_duas');
    for (const dua of ALLAHUMMA_DUAS) {
      await setDoc(doc(allahummaCol, String(dua.id)), dua);
    }
    console.log("Allahumma Duas migrated!");
    alert("Migration complete! All hardcoded data is now in Firebase.");
  } catch (e) {
    console.error("Migration failed:", e);
    alert("Migration failed! Check console.");
  }
}

export async function getDuaExplanation(dua: Dua): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Explain the significance and context of this Rabbana Dua: "${dua.translation}" (${dua.reference}). Provide practical lessons we can learn from it.`,
    });
    return response.text || "No explanation available.";
  } catch (e) {
    console.error("Failed to get explanation:", e);
    return "Sorry, I couldn't generate an explanation at this time. Please try again later.";
  }
}
