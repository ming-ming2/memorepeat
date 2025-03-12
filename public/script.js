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

// 현재 로그인한 사용자
let currentUser = null;

// 학습 데이터
let learningData = [];

// 에빙하우스 복습 간격 (일 단위)
const REVIEW_INTERVALS = [1, 7, 16, 35];

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

  // 소셜 로그인 버튼 이벤트
  googleLoginBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((error) => {
      console.error("Google 로그인 오류:", error);
      alert("로그인 중 오류가 발생했습니다.");
    });
  });

  naverLoginBtn.addEventListener("click", () => {
    alert("네이버 로그인은 Firebase 프로젝트에서 별도 설정이 필요합니다.");
    // 네이버 로그인 구현 (OIDC 또는 커스텀 인증)
  });

  kakaoLoginBtn.addEventListener("click", () => {
    alert("카카오 로그인은 Firebase 프로젝트에서 별도 설정이 필요합니다.");
    // 카카오 로그인 구현 (OIDC 또는 커스텀 인증)
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
  newLearningInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addNewLearning();
    }
  });

  // 모두 완료 버튼 이벤트
  completeAllNewBtn.addEventListener("click", () => completeAllItems(false));
  completeAllReviewBtn.addEventListener("click", () => completeAllItems(true));

  // 성공 메시지 닫기 버튼 이벤트
  successCloseBtn.addEventListener("click", () => {
    successOverlay.style.display = "none";
    confettiContainer.innerHTML = "";
  });
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
      // Firestore의 Timestamp를 ISO 문자열로 변환
      if (item.dateCreated instanceof firebase.firestore.Timestamp) {
        item.dateCreated = item.dateCreated.toDate().toISOString();
      }
      item.id = doc.id;
      learningData.push(item);
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

// 신규 학습 추가 함수
async function addNewLearning() {
  if (!currentUser) {
    alert("로그인이 필요합니다.");
    return;
  }

  const content = newLearningInput.value.trim();
  if (content.length === 0) return;

  const today = new Date();

  try {
    // Firestore에 직접 추가
    const newItemRef = await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("learningItems")
      .add({
        content: content,
        dateCreated: firebase.firestore.Timestamp.fromDate(today),
        reviewDates: calculateReviewDates(today).map((date) => date),
        completedReviews: [],
        completed: false,
      });

    // 로컬 데이터에 추가
    const newItem = {
      id: newItemRef.id,
      content: content,
      dateCreated: today.toISOString(),
      reviewDates: calculateReviewDates(today),
      completedReviews: [],
      completed: false,
    };

    learningData.push(newItem);
    newLearningInput.value = "";
    updateUI();
  } catch (error) {
    console.error("학습 항목 추가 오류:", error);
    alert("항목 추가 중 오류가 발생했습니다.");
  }
}

// 복습 날짜 계산 함수
function calculateReviewDates(startDate) {
  return REVIEW_INTERVALS.map((days) => {
    const reviewDate = new Date(startDate);
    reviewDate.setDate(reviewDate.getDate() + days);
    return reviewDate.toISOString().split("T")[0];
  });
}

// 아이템 완료 처리 함수
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
      const today = new Date().toISOString().split("T")[0];

      if (isReview) {
        // 복습 완료 처리
        if (!item.completedReviews.includes(today)) {
          item.completedReviews.push(today);
        }

        // Firestore 업데이트
        await db
          .collection("users")
          .doc(currentUser.uid)
          .collection("learningItems")
          .doc(id)
          .update({
            completedReviews: item.completedReviews,
          });
      } else {
        // 학습 완료 처리
        item.completed = true;

        // 새로운 학습 데이터 생성
        const newLearningData = {
          content: item.content,
          dateCreated: firebase.firestore.Timestamp.fromDate(
            new Date(item.dateCreated)
          ),
          reviewDates: calculateReviewDates(new Date(item.dateCreated)),
          completedReviews: [],
          completed: true,
        };

        // Firestore 업데이트
        await db
          .collection("users")
          .doc(currentUser.uid)
          .collection("learningItems")
          .doc(id)
          .update(newLearningData);
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
    // 간단한 완료 애니메이션만 적용
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

// 모든 항목 완료 체크 및 메시지 표시 함수
function checkAllItemsCompleted(isReview) {
  const today = new Date().toISOString().split("T")[0];

  if (isReview) {
    // 오늘 복습할 항목 확인
    const reviewItems = learningData.filter((item) => {
      return (
        !item.completed &&
        item.reviewDates.some((date) => {
          return date === today && !item.completedReviews.includes(today);
        })
      );
    });

    // 모든 복습 항목이 완료되었는지 확인
    if (reviewItems.length === 0) {
      showSuccessMessage("오늘의 모든 복습을 완료했습니다!", true);
    }
  } else {
    // 오늘 신규 학습 확인
    const newItems = learningData.filter((item) => {
      const itemDate = new Date(item.dateCreated).toISOString().split("T")[0];
      return itemDate === today && !item.completed;
    });

    // 모든 신규 학습이 완료되었는지 확인
    if (newItems.length === 0) {
      showSuccessMessage("오늘의 모든 학습을 완료했습니다!", false);
    }
  }
}

// 성공 메시지 표시 함수
function showSuccessMessage(message, isReview) {
  // 메시지 설정
  successMessage.textContent = message;

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

// 일괄 완료 함수
async function completeAllItems(isReview) {
  if (!currentUser) return;

  const today = new Date().toISOString().split("T")[0];
  let itemsToComplete = [];

  if (isReview) {
    // 오늘 복습할 항목 찾기
    itemsToComplete = learningData.filter((item) => {
      return (
        !item.completed &&
        item.reviewDates.some((date) => {
          return date === today && !item.completedReviews.includes(today);
        })
      );
    });
  } else {
    // 오늘 신규 학습 찾기
    itemsToComplete = learningData.filter((item) => {
      const itemDate = new Date(item.dateCreated).toISOString().split("T")[0];
      return itemDate === today && !item.completed;
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
        // 복습 완료 처리
        if (!item.completedReviews.includes(today)) {
          item.completedReviews.push(today);
        }
        batch.update(itemRef, {
          completedReviews: item.completedReviews,
        });
      } else {
        // 새로운 학습 데이터 생성
        const newLearningData = {
          content: item.content,
          dateCreated: firebase.firestore.Timestamp.fromDate(
            new Date(item.dateCreated)
          ),
          reviewDates: calculateReviewDates(new Date(item.dateCreated)),
          completedReviews: [],
          completed: true,
        };

        batch.update(itemRef, newLearningData);
        item.completed = true;
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

// UI 업데이트 함수
function updateUI() {
  const today = new Date().toISOString().split("T")[0];

  // 신규 학습 목록 업데이트
  const newItems = learningData.filter((item) => {
    const itemDate = new Date(item.dateCreated).toISOString().split("T")[0];
    return itemDate === today && !item.completed;
  });

  // 복습 목록 업데이트
  const reviewItems = learningData.filter((item) => {
    return (
      !item.completed &&
      item.reviewDates.some((date) => {
        return date === today && !item.completedReviews.includes(today);
      })
    );
  });

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

  // 복습 목록 렌더링
  reviewList.innerHTML = "";
  if (reviewItems.length === 0) {
    reviewList.appendChild(emptyReviewMessage);
  } else {
    reviewItems.forEach((item) => {
      const li = createLearningItem(item, true);
      reviewList.appendChild(li);
    });
  }
}

// 학습 아이템 요소 생성 함수
function createLearningItem(item, isReview) {
  const li = document.createElement("li");
  li.className = "learning-item";

  const itemDate = new Date(item.dateCreated);
  const formattedDate = `${itemDate.getFullYear()}-${String(
    itemDate.getMonth() + 1
  ).padStart(2, "0")}-${String(itemDate.getDate()).padStart(2, "0")}`;

  // 현재 복습 차수 계산
  let reviewStage = 0;
  if (isReview) {
    const today = new Date().toISOString().split("T")[0];
    reviewStage = item.reviewDates.findIndex((date) => date === today) + 1;
  }

  li.innerHTML = `
           <div class="learning-content">
               <div class="item-title">${item.content}</div>
               <div class="item-date">
                   📅 학습일: ${formattedDate}
                   ${
                     isReview
                       ? `<span class="review-date">${reviewStage}차 복습</span>`
                       : ""
                   }
               </div>
           </div>
           <div class="actions">
               <button class="btn btn-complete" data-id="${
                 item.id
               }">완료 ✅</button>
               <button class="btn btn-delete">삭제 🗑️</button>
           </div>
       `;

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
