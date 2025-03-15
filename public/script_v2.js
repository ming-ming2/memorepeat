// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM 요소
const loginContainer = document.getElementById("login-container");
const appContainer = document.getElementById("app-container");
const googleLoginBtn = document.getElementById("google-login");
const naverLoginBtn = document.getElementById("naver-login");
const kakaoLoginBtn = document.getElementById("kakao-login");
const userNickname = document.getElementById("user-nickname");
const changeNicknameBtn = document.getElementById("change-nickname-btn");
const logoutBtn = document.getElementById("logout-btn");

const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");
const newLearningInput = document.getElementById("new-learning-input");
const addLearningBtn = document.getElementById("add-learning-btn");
const newLearningList = document.getElementById("new-learning-list");
const reviewList = document.getElementById("review-list");
const newCountBadge = document.getElementById("new-count");
const reviewCountBadge = document.getElementById("review-count");
const emptyNewMessage = document.getElementById("empty-new");
const emptyReviewMessage = document.getElementById("empty-review");
const completeAllNewBtn = document.getElementById("complete-all-new");
const completeAllReviewBtn = document.getElementById("complete-all-review");
const successOverlay = document.getElementById("success-overlay");
const successEmoji = document.getElementById("success-emoji");
const successMessage = document.getElementById("success-message");
const successCloseBtn = document.getElementById("success-close-btn");
const confettiContainer = document.getElementById("confetti-container");
// DOM 요소 추가
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const emailLoginBtn = document.getElementById("email-login");
const emailSignupBtn = document.getElementById("email-signup");

// 현재 로그인한 사용자
let currentUser = null;

// 학습 데이터
let learningData = [];

// 에빙하우스 복습 간격 (일 단위)
const REVIEW_INTERVALS = [1, 7, 16, 35];

// 오늘 날짜를 YYYY-MM-DD 형식으로 일관되게 가져오는 함수
function getTodayFormatted() {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // 시간, 분, 초, 밀리초를 0으로 설정

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 앱 초기화
function initApp() {
  // 인증 상태 변경 감지
  auth.onAuthStateChanged((user) => {
    if (user) {
      // 사용자가 로그인한 경우
      currentUser = user;
      loginContainer.style.display = "none";
      appContainer.style.display = "block";

      // 사용자 정보 저장/업데이트
      saveUserInfo(user);

      // 사용자 데이터 로드
      loadUserData();

      // 닉네임 로드
      loadUserNickname();
    } else {
      // 로그인되지 않은 경우
      currentUser = null;
      loginContainer.style.display = "flex";
      appContainer.style.display = "none";

      // 데이터 초기화
      learningData = [];
    }
  });

  // 소셜 로그인 버튼 이벤트 - 에브리타임 앱 감지 추가
  let isAuthInProgress = false;

  // 웹뷰 감지 로직 수정
  googleLoginBtn.addEventListener("click", () => {
    if (isAuthInProgress) {
      console.log("인증이 이미 진행 중입니다. 잠시 기다려주세요.");
      return;
    }

    isAuthInProgress = true;
    googleLoginBtn.disabled = true;

    const provider = new firebase.auth.GoogleAuthProvider();

    // User Agent 확인
    const userAgent = navigator.userAgent.toLowerCase();
    console.log("UserAgent:", userAgent); // 디버깅용

    // 에브리타임 앱 감지 (User Agent에 'everytimeapp' 포함)
    const isEverytimeApp = userAgent.includes("everytimeapp");

    // 일반 Safari 브라우저 감지 (웹뷰가 아님)
    const isStandaloneSafari =
      userAgent.includes("safari") &&
      !userAgent.includes("chrome") &&
      !userAgent.includes("android") &&
      !userAgent.includes("wv") &&
      !userAgent.includes("iphone") && // 모바일 Safari는 별도로 처리
      !window.navigator.standalone;

    // iOS Safari 브라우저 감지
    const isIOSSafari =
      userAgent.includes("safari") &&
      userAgent.includes("iphone") &&
      !userAgent.includes("crios") && // Chrome for iOS가 아님
      !userAgent.includes("fxios") && // Firefox for iOS가 아님
      !window.navigator.standalone; // 홈 화면 앱이 아님

    // 웹뷰 감지
    const isWebView =
      userAgent.includes("wv") ||
      isEverytimeApp ||
      (userAgent.includes("iphone") && !userAgent.includes("safari")) || // iOS 웹뷰 (Safari 없음)
      userAgent.includes("instagram") ||
      userAgent.includes("fb_iab") ||
      userAgent.includes("kakaotalk") ||
      window.navigator.standalone ||
      window.matchMedia("(display-mode: standalone)").matches;

    console.log("에브리타임 앱:", isEverytimeApp);
    console.log("Safari 브라우저:", isStandaloneSafari || isIOSSafari);
    console.log("웹뷰 환경:", isWebView);

    // Safari 브라우저는 일반 브라우저로 처리
    if (isStandaloneSafari || isIOSSafari) {
      // 일반 Safari 브라우저에서는 팝업 방식 사용
      auth
        .signInWithPopup(provider)
        .catch((error) => {
          // 에러 처리
        })
        .finally(() => {
          isAuthInProgress = false;
          googleLoginBtn.disabled = false;
        });
    }
    // 에브리타임 앱인 경우
    else if (isEverytimeApp) {
      alert(
        "에브리타임 앱에서는 Google 로그인이 제한됩니다. 외부 브라우저(Safari 등)에서 접속하거나 이메일 로그인을 이용해주세요."
      );
      isAuthInProgress = false;
      googleLoginBtn.disabled = false;
    }
    // 다른 웹뷰인 경우
    else if (isWebView) {
      alert(
        "일부 앱 내 브라우저에서는 Google 로그인이 제한될 수 있습니다. 문제가 계속되면 외부 브라우저에서 접속하세요."
      );
      // 웹뷰에서도 시도는 해봄
      auth
        .signInWithRedirect(provider)
        .catch((error) => {
          console.log("로그인 오류:", error);
        })
        .finally(() => {
          isAuthInProgress = false;
          googleLoginBtn.disabled = false;
        });
    }
    // 일반 브라우저
    else {
      // 일반 브라우저에서는 팝업 방식 사용
      auth
        .signInWithPopup(provider)
        .catch((error) => {
          // 에러 처리
        })
        .finally(() => {
          isAuthInProgress = false;
          googleLoginBtn.disabled = false;
        });
    }
  });
  // 이메일 로그인
  emailLoginBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error("이메일 로그인 오류:", error);
      alert("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    }
  });
  // 이메일 비밀번호 입력 필드에 엔터 키 이벤트 추가
  passwordInput.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // 폼 제출 방지

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        alert("이메일과 비밀번호를 모두 입력해주세요.");
        return;
      }

      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (error) {
        console.error("이메일 로그인 오류:", error);
        alert("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
      }
    }
  });
  // 이메일 유효성 검사 함수
  async function validateEmail(email) {
    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("유효한 이메일 주소를 입력해주세요.");
    }

    // 이메일 중복 검사
    try {
      const methods = await auth.fetchSignInMethodsForEmail(email);
      if (methods.length > 0) {
        throw new Error("이미 사용 중인 이메일입니다.");
      }
    } catch (error) {
      if (error.code === "auth/invalid-email") {
        throw new Error("유효하지 않은 이메일 형식입니다.");
      }
      throw error;
    }
  }

  // 비밀번호 유효성 검사 함수
  function validatePassword(password) {
    if (password.length < 6) {
      throw new Error("비밀번호는 최소 6자 이상이어야 합니다.");
    }
  }

  emailSignupBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      // 중복 이메일 체크
      const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
      if (methods.length > 0) {
        alert("이미 사용 중인 이메일입니다. 다른 이메일을 입력해주세요.");
        return; // 중복 이메일이면 여기서 함수 종료
      }

      // 회원가입 진행
      const userCredential = await firebase
        .auth()
        .createUserWithEmailAndPassword(email, password);

      if (userCredential.user) {
        emailInput.value = "";
        passwordInput.value = "";
        alert("회원가입이 완료되었습니다.");
      }
    } catch (error) {
      let errorMessage = "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";

      // Firebase 에러 메시지 직접 처리
      if (error.code === "auth/email-already-in-use") {
        errorMessage =
          "이미 사용 중인 이메일입니다. 다른 이메일을 입력해주세요.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "비밀번호는 최소 6자 이상이어야 합니다.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "유효하지 않은 이메일 형식입니다.";
      }

      alert(errorMessage);
    }
  });

  // 닉네임 변경 이벤트
  changeNicknameBtn.addEventListener("click", () => {
    showNicknameModal();
  });

  // 닉네임 저장 버튼 이벤트
  saveNicknameBtn.addEventListener("click", () => {
    const newNickname = nicknameInput.value.trim();
    if (newNickname) {
      updateUserNickname(newNickname);
    } else {
      alert("닉네임을 입력해주세요.");
    }
  });

  // 닉네임 입력 필드 엔터 키 이벤트
  nicknameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const newNickname = nicknameInput.value.trim();
      if (newNickname) {
        updateUserNickname(newNickname);
      } else {
        alert("닉네임을 입력해주세요.");
      }
    }
  });

  // 로그아웃 이벤트
  logoutBtn.addEventListener("click", () => {
    auth.signOut().catch((error) => {
      console.error("로그아웃 오류:", error);
    });
  });

  // 탭 전환 이벤트
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");

      // 활성 탭 변경
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // 탭 컨텐츠 변경
      tabContents.forEach((content) => {
        content.classList.remove("active");
        if (content.id === tabId) {
          content.classList.add("active");
        }
      });
    });
  });

  // 신규 학습 추가 이벤트
  addLearningBtn.addEventListener("click", addNewLearning);
  newLearningInput.addEventListener("keydown", (e) => {
    // 모바일 장치 감지
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (e.key === "Enter") {
      if (isMobile || e.shiftKey) {
        // 모바일이거나 Shift+Enter면 개행 허용 (기본 동작)
        return true;
      } else {
        // 데스크톱에서 일반 엔터는 제출
        e.preventDefault();
        addNewLearning();
      }
    }
  });

  // 텍스트 입력 시 높이 자동 조절
  newLearningInput.addEventListener("input", autoResizeTextarea);

  // 초기화 시 높이 설정
  autoResizeTextarea();

  // 모두 완료 버튼 이벤트
  completeAllNewBtn.addEventListener("click", () => completeAllItems(false));
  completeAllReviewBtn.addEventListener("click", () => completeAllItems(true));

  // 성공 메시지 닫기 버튼 이벤트
  successCloseBtn.addEventListener("click", () => {
    successOverlay.style.display = "none";
    confettiContainer.innerHTML = "";
  });
}

// 자동 높이 조절 함수
function autoResizeTextarea() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  // 입력 내용이 있을 때만 높이 조절
  if (newLearningInput.value.trim()) {
    // 현재 높이 저장
    const currentHeight = newLearningInput.style.height;

    // 높이 재설정을 위해 임시로 auto로 설정
    newLearningInput.style.height = "auto";

    // 내용에 따라 높이 계산 (최대 120px 제한)
    const newHeight = Math.min(newLearningInput.scrollHeight, 120);

    // 계산된 높이 적용
    newLearningInput.style.height = newHeight + "px";
  } else {
    // 내용이 없을 때는 기본 높이로 설정
    newLearningInput.style.height = isMobile ? "40px" : "60px";
  }
}

// 사용자 정보 저장/업데이트
async function saveUserInfo(user) {
  try {
    const userRef = db.collection("users").doc(user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // 새 사용자 등록
      await userRef.set({
        nickname: user.displayName || "사용자",
        email: user.email,
        photoURL: user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 마지막 로그인 시간 업데이트
    await userRef.update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("사용자 정보 저장 오류:", error);
  }
}

// 닉네임 관련 요소
const nicknameModal = document.getElementById("nickname-modal");
const nicknameInput = document.getElementById("nickname-input");
const saveNicknameBtn = document.getElementById("save-nickname-btn");

// 닉네임 모달 표시
function showNicknameModal() {
  nicknameModal.style.display = "flex";
  nicknameInput.focus();

  // 현재 닉네임이 있으면 입력 필드에 설정
  if (
    userNickname.textContent &&
    userNickname.textContent !== "닉네임 로딩 중..." &&
    userNickname.textContent !== "사용자"
  ) {
    nicknameInput.value = userNickname.textContent;
  }
}

// 닉네임 모달 숨기기
function hideNicknameModal() {
  nicknameModal.style.display = "none";
}

// 닉네임 로드 및 필요시 모달 표시
async function loadUserNickname() {
  if (!currentUser) return;

  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const nickname = userData.nickname || "";

      userNickname.textContent = nickname || "사용자";

      // 닉네임이 설정되지 않았거나 기본값이면 모달 표시
      if (!nickname || nickname === "사용자") {
        showNicknameModal();
      }
    } else {
      // 사용자 문서가 없으면 모달 표시
      showNicknameModal();
    }
  } catch (error) {
    console.error("닉네임 로드 오류:", error);
    userNickname.textContent = "사용자";
  }
}

// 닉네임 업데이트
async function updateUserNickname(newNickname) {
  if (!currentUser || !newNickname.trim()) return;

  try {
    await db.collection("users").doc(currentUser.uid).update({
      nickname: newNickname,
    });
    userNickname.textContent = newNickname;
    hideNicknameModal();
  } catch (error) {
    console.error("닉네임 업데이트 오류:", error);
    alert("닉네임 변경 중 오류가 발생했습니다.");
  }
}

// 데이터 로드 함수 (Firebase 버전)
async function loadUserData() {
  if (!currentUser) return;

  try {
    // 사용자의 모든 학습 항목 불러오기
    const snapshot = await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("learningItems")
      .get();

    learningData = [];
    snapshot.forEach((doc) => {
      const item = doc.data();

      // Firestore의 Timestamp를 Date 객체로 변환 후 ISO 문자열로
      if (item.dateCreated instanceof firebase.firestore.Timestamp) {
        item.dateCreated = item.dateCreated.toDate().toISOString();
      }

      // 복습 날짜 배열이 없는 경우 초기화
      if (!item.reviewDates || !Array.isArray(item.reviewDates)) {
        // 날짜 생성일을 기준으로 복습 날짜 다시 계산
        const startDate = new Date(item.dateCreated);
        item.reviewDates = calculateReviewDates(startDate);
      }

      // 완료된 복습 배열이 없는 경우 초기화
      if (!item.completedReviews || !Array.isArray(item.completedReviews)) {
        item.completedReviews = [];
      }

      item.id = doc.id;
      learningData.push(item);
    });

    // 오늘 날짜 확인
    const today = getTodayFormatted();
    console.log("오늘 날짜:", today);

    // 디버깅: 복습이 필요한 항목들 확인
    learningData.forEach((item) => {
      if (!item.completed) {
        console.log(`항목: ${item.content}`);
        console.log(`- 복습 날짜: ${JSON.stringify(item.reviewDates)}`);
        console.log(`- 완료된 복습: ${JSON.stringify(item.completedReviews)}`);

        // 오늘 복습이 필요한지 확인
        const needsReviewToday =
          item.reviewDates.includes(today) &&
          !item.completedReviews.includes(today);
        console.log(`- 오늘 복습 필요: ${needsReviewToday}`);
      }
    });

    updateUI();
  } catch (error) {
    console.error("데이터 로드 오류:", error);
  }
}

// 데이터 저장 함수 (Firebase 버전)
async function saveLearningData() {
  if (!currentUser || learningData.length === 0) return;

  try {
    const batch = db.batch();
    const itemsRef = db
      .collection("users")
      .doc(currentUser.uid)
      .collection("learningItems");

    // 기존 항목 가져오기
    const snapshot = await itemsRef.get();
    const existingIds = new Set();
    snapshot.forEach((doc) => existingIds.add(doc.id));

    // 항목 추가/업데이트
    for (const item of learningData) {
      const itemData = { ...item };
      const itemId = item.id;

      // id는 문서 ID로 사용하므로 데이터에서 제외
      delete itemData.id;

      // 날짜 문자열을 Firestore Timestamp로 변환
      if (typeof itemData.dateCreated === "string") {
        itemData.dateCreated = firebase.firestore.Timestamp.fromDate(
          new Date(itemData.dateCreated)
        );
      }

      const docRef = itemsRef.doc(itemId);
      batch.set(docRef, itemData);

      existingIds.delete(itemId);
    }

    // 삭제된 항목 제거
    for (const id of existingIds) {
      batch.delete(itemsRef.doc(id));
    }

    await batch.commit();
  } catch (error) {
    console.error("데이터 저장 오류:", error);
  }
}

// addNewLearning 함수 수정
async function addNewLearning() {
  if (!currentUser) {
    alert("로그인이 필요합니다.");
    return;
  }

  const content = newLearningInput.value.trim();
  if (content.length === 0) return;

  // 오늘 자정 시간으로 설정
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // 중요 변경: 처음에는 빈 reviewDates 배열 사용
    // (완료 버튼을 누를 때 복습 일정이 생성됨)
    const reviewDates = [];

    // Firestore에 직접 추가
    const newItemRef = await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("learningItems")
      .add({
        content: content,
        dateCreated: firebase.firestore.Timestamp.fromDate(today),
        reviewDates: reviewDates, // 빈 배열로 시작
        completedReviews: [],
        completed: false,
        isNewLearning: true,
        learningCompleted: false,
      });

    // 로컬 데이터에 추가
    const newItem = {
      id: newItemRef.id,
      content: content,
      dateCreated: today.toISOString(),
      reviewDates: reviewDates, // 빈 배열로 시작
      completedReviews: [],
      completed: false,
      isNewLearning: true,
      learningCompleted: false,
    };

    learningData.push(newItem);

    // 입력창 초기화 및 크기 리셋
    newLearningInput.value = "";
    newLearningInput.style.height = ""; // 스타일 초기화
    autoResizeTextarea(); // 기본 높이로 리셋

    // UI 업데이트
    updateUI();
  } catch (error) {
    console.error("학습 항목 추가 오류:", error);
    alert("항목 추가 중 오류가 발생했습니다.");
  }
}

// 복습 날짜 계산 함수
function calculateReviewDates(startDate) {
  // 시작일이 Date 객체인지 확인
  const baseDate = startDate instanceof Date ? startDate : new Date(startDate);
  baseDate.setHours(0, 0, 0, 0); // 시간 부분을 0으로 설정

  return REVIEW_INTERVALS.map((days) => {
    const reviewDate = new Date(baseDate);
    reviewDate.setDate(reviewDate.getDate() + days);

    // YYYY-MM-DD 형식으로 반환
    const year = reviewDate.getFullYear();
    const month = String(reviewDate.getMonth() + 1).padStart(2, "0");
    const day = String(reviewDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  });
}

// 아이템 완료 처리 함수 수정
async function completeItem(id, isReview = false, skipAnimation = false) {
  if (!currentUser) return;

  const itemIndex = learningData.findIndex((item) => item.id === id);
  if (itemIndex === -1) return;

  const item = learningData[itemIndex];

  // 완료 효과 표시를 위해 DOM 요소 찾기
  const itemElements = document.querySelectorAll(".learning-item");
  let itemElement = null;

  // ID를 통해 해당 DOM 요소 찾기
  itemElements.forEach((el) => {
    if (el.querySelector(".btn-complete").dataset.id === id) {
      itemElement = el;
    }
  });

  // 데이터 업데이트 함수
  const updateItemData = async () => {
    try {
      const today = getTodayFormatted();

      if (isReview) {
        // 복습 완료 처리 - 가장 오래된 대기 중인 복습 날짜만 처리
        const pendingReviews = item.reviewDates.filter(
          (date) =>
            new Date(date) <= new Date(today) &&
            !item.completedReviews.includes(date)
        );

        // 날짜 정렬
        pendingReviews.sort((a, b) => new Date(a) - new Date(b));

        // 가장 오래된 복습 날짜
        const oldestPendingDate =
          pendingReviews.length > 0 ? pendingReviews[0] : today;

        // 복습 완료 처리 - 해당 날짜만 completedReviews에 추가
        if (!item.completedReviews.includes(oldestPendingDate)) {
          item.completedReviews.push(oldestPendingDate);
        }

        // Firestore 업데이트 - completed 값은 변경하지 않음
        await db
          .collection("users")
          .doc(currentUser.uid)
          .collection("learningItems")
          .doc(id)
          .update({
            completedReviews: item.completedReviews,
          });

        console.log(
          `복습 완료 처리: ${oldestPendingDate} 날짜의 복습을 완료했습니다.`
        );
      } else {
        // 신규 학습 완료 처리

        // 중요 변경: 학습 완료시 복습 일정 생성
        const baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);

        // 복습 날짜 계산
        const reviewDates = calculateReviewDates(baseDate);

        // 항목 상태 업데이트
        item.learningCompleted = true;
        item.reviewDates = reviewDates; // 새로 계산된 복습 일정 추가

        // Firestore 업데이트
        await db
          .collection("users")
          .doc(currentUser.uid)
          .collection("learningItems")
          .doc(id)
          .update({
            learningCompleted: true,
            reviewDates: reviewDates, // 복습 일정 업데이트
          });

        console.log(
          `신규 학습 완료 처리: 항목 학습을 완료했습니다. 복습 일정이 생성되었습니다.`
        );
      }

      // UI 업데이트
      if (!skipAnimation) {
        updateUI();
      }

      // 학습 항목 전체 완료 체크하여 메시지 표시
      if (!skipAnimation) {
        checkAllItemsCompleted(isReview);
      }
    } catch (error) {
      console.error("항목 완료 처리 오류:", error);
    }
  };

  if (itemElement && !skipAnimation) {
    // 애니메이션 및 효과 (기존 코드 그대로 유지)
    itemElement.classList.add("celebrating");

    // 체크마크 효과 표시
    const checkmarkContainer = document.createElement("div");
    checkmarkContainer.className = "checkmark-container";
    checkmarkContainer.innerHTML = '<div class="checkmark">✓</div>';
    itemElement.appendChild(checkmarkContainer);

    // 완료 사운드 재생 시도 (브라우저에서 허용된 경우)
    try {
      const completeSound = new Audio(
        "data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFzb25pY1N0dWRpb3MuY29tIA9URU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"
      );
      completeSound.play();
    } catch (e) {
      console.log("사운드 재생이 지원되지 않습니다.");
    }

    // 0.5초 후 완료 처리 (애니메이션 시간 단축)
    setTimeout(() => {
      // UI 업데이트 전에 완료 스타일 적용
      itemElement.classList.add("completed");

      // 체크마크 컨테이너 제거 (단축된 시간)
      setTimeout(() => {
        if (checkmarkContainer.parentNode) {
          checkmarkContainer.parentNode.removeChild(checkmarkContainer);
        }

        // 데이터 저장 및 업데이트
        updateItemData();
      }, 300);
    }, 500);
  } else {
    // 애니메이션 없이 즉시 처리 (일괄 완료 시)
    await updateItemData();
  }
}

// 모든 항목 완료 체크 및 메시지 표시 함수 수정
function checkAllItemsCompleted(isReview) {
  const today = getTodayFormatted();

  if (isReview) {
    // 오늘 복습할 항목 확인
    const reviewItems = learningData.filter((item) => {
      // 오늘이나 이전 날짜 중 아직 완료하지 않은 복습이 있는지 확인
      const pendingReviews = item.reviewDates.filter(
        (date) =>
          new Date(date) <= new Date(today) &&
          !item.completedReviews.includes(date)
      );

      return pendingReviews.length > 0;
    });

    // 모든 복습 항목이 완료되었는지 확인
    if (reviewItems.length === 0) {
      showSuccessMessage("오늘의 모든 복습을 완료했습니다!", true);
    }
  } else {
    // 오늘 신규 학습 확인
    const newItems = learningData.filter((item) => {
      const itemDate = new Date(item.dateCreated);
      const itemDateStr = `${itemDate.getFullYear()}-${String(
        itemDate.getMonth() + 1
      ).padStart(2, "0")}-${String(itemDate.getDate()).padStart(2, "0")}`;
      return (
        itemDateStr === today && item.isNewLearning && !item.learningCompleted
      );
    });

    // 모든 신규 학습이 완료되었는지 확인
    if (newItems.length === 0) {
      showSuccessMessage("오늘의 모든 학습을 완료했습니다!", false);
    }
  }
}

// 성공 메시지 표시 함수 - 닉네임 포함
function showSuccessMessage(message, isReview) {
  // 현재 사용자의 닉네임 가져오기
  const nickname = userNickname.textContent || "사용자";

  // 닉네임을 포함한 메시지 설정
  successMessage.textContent = `${nickname}님, ${message}`;

  // 이모지 설정
  successEmoji.textContent = isReview ? "🧠" : "🎉";

  // 타이틀 설정
  document.querySelector(".success-title").textContent = isReview
    ? "복습 완료!"
    : "학습 완료!";

  // 폭죽 효과 생성
  createConfetti();

  // 모달 표시
  successOverlay.style.display = "flex";

  // 성공 사운드 재생
  try {
    const successSound = new Audio(
      "data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFzb25pY1N0dWRpb3MuY29tIA9URU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"
    );
    successSound.play();
  } catch (e) {
    console.log("사운드 재생이 지원되지 않습니다.");
  }
}

// 일괄 완료 함수 수정
async function completeAllItems(isReview) {
  if (!currentUser) return;

  const today = getTodayFormatted();
  let itemsToComplete = [];

  if (isReview) {
    // 복습 항목 찾기 (기존 코드 유지)
    itemsToComplete = learningData.filter((item) => {
      const pendingReviews = item.reviewDates.filter(
        (date) =>
          new Date(date) <= new Date(today) &&
          !item.completedReviews.includes(date)
      );

      return pendingReviews.length > 0;
    });
  } else {
    // 오늘 신규 학습 찾기
    itemsToComplete = learningData.filter((item) => {
      const itemDate = new Date(item.dateCreated);
      const itemDateStr = `${itemDate.getFullYear()}-${String(
        itemDate.getMonth() + 1
      ).padStart(2, "0")}-${String(itemDate.getDate()).padStart(2, "0")}`;
      return (
        itemDateStr === today && item.isNewLearning && !item.learningCompleted
      );
    });
  }

  // 완료할 항목이 있는지 확인
  if (itemsToComplete.length === 0) {
    return;
  }

  try {
    // Firestore 배치 작업 준비
    const batch = db.batch();
    const itemsRef = db
      .collection("users")
      .doc(currentUser.uid)
      .collection("learningItems");

    // 각 항목 업데이트
    for (const item of itemsToComplete) {
      const itemRef = itemsRef.doc(item.id);

      if (isReview) {
        // 복습 완료 처리 (기존 코드 유지)
        const pendingReviews = item.reviewDates.filter(
          (date) =>
            new Date(date) <= new Date(today) &&
            !item.completedReviews.includes(date)
        );

        pendingReviews.sort((a, b) => new Date(a) - new Date(b));

        if (pendingReviews.length > 0) {
          const oldestPendingDate = pendingReviews[0];

          if (!item.completedReviews.includes(oldestPendingDate)) {
            item.completedReviews.push(oldestPendingDate);
          }

          batch.update(itemRef, {
            completedReviews: item.completedReviews,
          });
        }
      } else {
        // 신규 학습 완료 처리 - 수정된 부분

        // 복습 일정 계산
        const baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);
        const reviewDates = calculateReviewDates(baseDate);

        item.learningCompleted = true;
        item.reviewDates = reviewDates; // 복습 일정 추가

        // Firestore 업데이트
        batch.update(itemRef, {
          learningCompleted: true,
          reviewDates: reviewDates, // 복습 일정 추가
        });
      }
    }

    // 배치 실행
    await batch.commit();

    // UI 업데이트
    updateUI();

    // 성공 메시지 표시
    showSuccessMessage(
      isReview
        ? "오늘의 모든 복습을 완료했습니다!"
        : "오늘의 모든 학습을 완료했습니다!",
      isReview
    );
  } catch (error) {
    console.error("일괄 완료 처리 오류:", error);
    alert("항목 완료 중 오류가 발생했습니다.");
  }
}

// 아이템 삭제 함수
async function deleteItem(id) {
  if (!currentUser) return;

  const itemIndex = learningData.findIndex((item) => item.id === id);
  if (itemIndex === -1) return;

  try {
    // Firestore에서 삭제
    await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("learningItems")
      .doc(id)
      .delete();

    // 로컬 데이터에서 삭제
    learningData.splice(itemIndex, 1);
    updateUI();
  } catch (error) {
    console.error("항목 삭제 오류:", error);
    alert("항목 삭제 중 오류가 발생했습니다.");
  }
}

// UI 업데이트 함수 수정
function updateUI() {
  const today = getTodayFormatted();

  // 신규 학습 목록 업데이트
  const newItems = learningData.filter((item) => {
    // 날짜만 비교하기 위해 item.dateCreated에서 날짜 부분만 추출
    const itemDate = new Date(item.dateCreated);
    const itemDateStr = `${itemDate.getFullYear()}-${String(
      itemDate.getMonth() + 1
    ).padStart(2, "0")}-${String(itemDate.getDate()).padStart(2, "0")}`;

    // 오늘 생성된 항목이고 신규 학습이 완료되지 않은 항목
    return (
      itemDateStr === today && item.isNewLearning && !item.learningCompleted
    );
  });

  // 복습 목록 업데이트 - 로직 개선: 학습 완료 여부와 관계없이 복습 날짜에 따라 표시
  const reviewItems = learningData.filter((item) => {
    // reviewDates 배열이 있는지 확인
    if (!item.reviewDates || !Array.isArray(item.reviewDates)) return false;

    // 오늘 또는 그 이전 날짜의 복습 중 아직 완료하지 않은 항목 찾기
    const pendingReviews = item.reviewDates.filter((reviewDate) => {
      // 복습 날짜가 오늘이거나 이전 날짜인지 확인
      return (
        new Date(reviewDate) <= new Date(today) &&
        !item.completedReviews.includes(reviewDate)
      );
    });

    // 대기 중인 복습이 하나라도 있으면 표시
    return pendingReviews.length > 0;
  });

  // 디버깅: 필터링된 결과 확인
  console.log(`오늘(${today}) 신규 학습 항목 수: ${newItems.length}`);
  console.log(`오늘 및 미루어진 복습 항목 수: ${reviewItems.length}`);

  // 카운트 배지 업데이트
  newCountBadge.textContent = newItems.length;
  reviewCountBadge.textContent = reviewItems.length;

  // 신규 학습 목록 렌더링
  newLearningList.innerHTML = "";
  if (newItems.length === 0) {
    newLearningList.appendChild(emptyNewMessage);
  } else {
    newItems.forEach((item) => {
      const li = createLearningItem(item, false);
      newLearningList.appendChild(li);
    });
  }

  // 복습 목록 렌더링 - 날짜별로 정렬
  reviewList.innerHTML = "";
  if (reviewItems.length === 0) {
    reviewList.appendChild(emptyReviewMessage);
  } else {
    // 가장 오래된 복습부터 정렬
    reviewItems.sort((a, b) => {
      // 각 항목의 가장 오래된 대기 중인 복습 날짜 찾기
      const oldestReviewA = findOldestPendingReview(a);
      const oldestReviewB = findOldestPendingReview(b);

      // 날짜 비교
      return new Date(oldestReviewA) - new Date(oldestReviewB);
    });

    reviewItems.forEach((item) => {
      const li = createLearningItem(item, true);
      reviewList.appendChild(li);
    });
  }
}

// 가장 오래된 대기 중인 복습 날짜 찾기
function findOldestPendingReview(item) {
  const today = getTodayFormatted();

  // 오늘 또는 그 이전 날짜의 복습 중 완료하지 않은 가장 오래된 날짜 찾기
  const pendingDates = item.reviewDates.filter((date) => {
    return (
      new Date(date) <= new Date(today) && !item.completedReviews.includes(date)
    );
  });

  // 날짜순 정렬
  pendingDates.sort((a, b) => new Date(a) - new Date(b));

  // 가장 오래된 날짜 반환 (없으면 오늘 날짜)
  return pendingDates.length > 0 ? pendingDates[0] : today;
}

// 가장 오래된 대기 중인 복습 날짜 찾기
function findOldestPendingReview(item) {
  const today = getTodayFormatted();

  // 오늘 또는 그 이전 날짜의 복습 중 완료하지 않은 가장 오래된 날짜 찾기
  const pendingDates = item.reviewDates.filter((date) => {
    return (
      new Date(date) <= new Date(today) && !item.completedReviews.includes(date)
    );
  });

  // 날짜순 정렬
  pendingDates.sort((a, b) => new Date(a) - new Date(b));

  // 가장 오래된 날짜 반환 (없으면 오늘 날짜)
  return pendingDates.length > 0 ? pendingDates[0] : today;
}

// 학습 아이템 요소 생성 함수
function createLearningItem(item, isReview) {
  const li = document.createElement("li");
  li.className = "learning-item";

  const itemDate = new Date(item.dateCreated);
  const formattedDate = `${itemDate.getFullYear()}-${String(
    itemDate.getMonth() + 1
  ).padStart(2, "0")}-${String(itemDate.getDate()).padStart(2, "0")}`;

  // 현재 복습 차수 계산 및 복습 지연 상태 확인
  let reviewStage = 0;
  let isDelayed = false;
  let reviewDateStr = "";

  if (isReview) {
    const today = getTodayFormatted();
    // 가장 오래된 대기 중인 복습 찾기
    const oldestPendingDate = findOldestPendingReview(item);
    reviewStage =
      item.reviewDates.findIndex((date) => date === oldestPendingDate) + 1;

    // 복습 날짜가 오늘보다 이전인지 확인
    isDelayed = new Date(oldestPendingDate) < new Date(today);

    // 복습 예정일 표시
    const reviewDate = new Date(oldestPendingDate);
    reviewDateStr = `${reviewDate.getFullYear()}-${String(
      reviewDate.getMonth() + 1
    ).padStart(2, "0")}-${String(reviewDate.getDate()).padStart(2, "0")}`;
  }

  // item.content의 개행 문자를 보존하고 안전하게 HTML 삽입
  // 중요: XSS 방지를 위해 안전한 텍스트 삽입 방식 사용
  const contentDiv = document.createElement("div");
  contentDiv.className = "item-title";
  contentDiv.textContent = item.content; // textContent는 XSS 공격 방지

  // 나머지 HTML 구성
  li.innerHTML = `
    <div class="learning-content">
      <div class="item-date">
        📅 학습일: ${formattedDate}
        ${
          isReview
            ? `<span class="review-date ${
                isDelayed ? "delayed" : ""
              }">${reviewStage}차 ${isDelayed ? "지연" : "복습"}</span>
               <span class="review-scheduled-date">예정일: ${reviewDateStr}</span>`
            : ""
        }
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-complete" data-id="${item.id}">완료 ✅</button>
      <button class="btn btn-delete">삭제 🗑️</button>
    </div>
  `;

  // 제목 요소를 HTML에 직접 추가
  const learningContent = li.querySelector(".learning-content");
  learningContent.insertBefore(contentDiv, learningContent.firstChild);

  // 항목이 지연된 경우 시각적 표시 추가
  if (isReview && isDelayed) {
    li.classList.add("delayed-review");
  }

  // 완료 버튼 이벤트
  li.querySelector(".btn-complete").addEventListener("click", () => {
    completeItem(item.id, isReview);
  });

  // 삭제 버튼 이벤트
  li.querySelector(".btn-delete").addEventListener("click", () => {
    deleteItem(item.id);
  });

  return li;
}

// 폭죽 효과 생성 함수
function createConfetti() {
  confettiContainer.innerHTML = "";

  // 50개의 색상이 다른 폭죽 생성
  const colors = ["red", "blue", "yellow", "green"];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement("div");

    // 색상 랜덤 설정
    const colorClass = colors[Math.floor(Math.random() * colors.length)];

    // 인라인 스타일로 각 폭죽 스타일링
    confetti.style.position = "absolute";
    confetti.style.width = `${Math.random() * 10 + 5}px`;
    confetti.style.height = `${Math.random() * 10 + 5}px`;
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.opacity = "0";

    // 색상 설정
    if (colorClass === "red") confetti.style.backgroundColor = "#FF6B6B";
    if (colorClass === "blue") confetti.style.backgroundColor = "#7BD3EA";
    if (colorClass === "yellow") confetti.style.backgroundColor = "#FFEB3B";
    if (colorClass === "green") confetti.style.backgroundColor = "#4CAF50";

    // 모양 설정 (원 또는 사각형)
    confetti.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";

    // 애니메이션 설정
    const duration = Math.random() * 3 + 2;
    const delay = Math.random() * 3;

    confetti.style.animation = `confettiFall ${duration}s ease-in-out ${delay}s`;

    confettiContainer.appendChild(confetti);
  }
}

// 앱 시작
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
