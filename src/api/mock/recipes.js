// [개발 목업 데이터] 레시피 5개 — GET /api/recommendations·/rescue·/recipes/:id 를 흉내 낼 때 쓰는 원본. dev:mock 전용.
// - 화면 확인용 예시이며 실제 시드(DB 519개) 데이터가 아니다.
// - 조리시간은 15분 이하 3개 + 15분 초과 2개(25·20분) → '15분 이하 먼저' 정렬을 목업에서 볼 수 있다.
// - key_menu(대표 메뉴): 두부조림·감자채볶음 → 추천 화면 위 '자주 해 먹는 대표 메뉴' 영역(2026-10-19)
// - image_url(완성 사진) 3가지 상태:
//   두부조림·대파계란볶음밥·양파계란덮밥 = 목업 일러스트 / 감자채볶음 = 깨진 URL(실패 → 영역 숨김) / 애호박 돼지고기 볶음 = null(사진 없음)
// - 이미지 파일은 이 모듈에서만 import하므로 dev:mock이 아닌 빌드에는 포함되지 않는다.
import dubuJorimImg from './images/dubu-jorim.svg';
import eggFriedRiceImg from './images/egg-fried-rice.svg';
import onionEggBowlImg from './images/onion-egg-bowl.svg';

// is_seasoning=true(양념)와 '밥'은 서버 규칙상 항상 보유로 본다(가상 보유, my_ingredient_id=null)
export const RECIPES = [
  {
    id: 41, title: '두부조림', cook_time_min: 15, servings: '2인분', image_url: dubuJorimImg, key_menu: true,
    ingredients: [
      { name: '두부', amount: '1모', is_seasoning: false },
      { name: '대파', amount: '1/2대', is_seasoning: false },
      { name: '간장', amount: '2큰술', is_seasoning: true },
      { name: '고춧가루', amount: '1큰술', is_seasoning: true },
    ],
    steps: ['두부를 1cm 두께로 썬다.', '대파를 송송 썬다.', '팬에 두부를 굽고 양념장을 끼얹어 졸인다.'],
  },
  {
    id: 52, title: '대파계란볶음밥', cook_time_min: 10, servings: '1인분', image_url: eggFriedRiceImg,
    ingredients: [
      { name: '밥', amount: '1공기', is_seasoning: false },
      { name: '계란', amount: '2개', is_seasoning: false },
      { name: '대파', amount: '1대', is_seasoning: false },
      { name: '소금', amount: '약간', is_seasoning: true },
    ],
    steps: ['대파를 기름에 볶아 파기름을 낸다.', '계란을 넣어 스크램블한다.', '밥을 넣고 소금으로 간한다.'],
  },
  {
    id: 63, title: '양파계란덮밥', cook_time_min: 12, servings: '1인분', image_url: onionEggBowlImg,
    ingredients: [
      { name: '밥', amount: '1공기', is_seasoning: false },
      { name: '양파', amount: '1/2개', is_seasoning: false },
      { name: '계란', amount: '1개', is_seasoning: false },
      { name: '간장', amount: '1큰술', is_seasoning: true },
    ],
    steps: ['양파를 채 썰어 간장과 물에 끓인다.', '계란물을 붓고 반숙으로 익힌다.', '밥 위에 올린다.'],
  },
  {
    id: 74, title: '감자채볶음', cook_time_min: 25, servings: '2인분', image_url: '/__mock__/missing-photo.jpg', key_menu: true,
    ingredients: [
      { name: '감자', amount: '2개', is_seasoning: false },
      { name: '양파', amount: '1/4개', is_seasoning: false },
      { name: '소금', amount: '약간', is_seasoning: true },
    ],
    steps: ['감자를 채 썰어 물에 헹군다.', '양파와 함께 볶는다.', '소금으로 간한다.'],
  },
  {
    id: 85, title: '애호박 돼지고기 볶음', cook_time_min: 20, servings: '2인분', image_url: null,
    ingredients: [
      { name: '애호박', amount: '1개', is_seasoning: false },
      { name: '돼지고기', amount: '150g', is_seasoning: false },
      { name: '마늘', amount: '3쪽', is_seasoning: false },
      { name: '간장', amount: '1큰술', is_seasoning: true },
    ],
    steps: ['재료를 한입 크기로 썬다.', '돼지고기를 먼저 볶는다.', '애호박과 마늘을 넣고 간장으로 마무리한다.'],
  },
];
