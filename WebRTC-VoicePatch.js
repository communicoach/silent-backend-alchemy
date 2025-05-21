// CommuniCoach - Realtime Voice Integration via Daily.co + Dark Mode Toggle + Mic UI + Toasts + Keyboard + Animations

const RealtimeAPI = (function () {
    let callObject = null;
    let isVoiceActive = false;
    const DAILY_ROOM_URL = "https://communicoach.daily.co/CommuniCoach"; // Replace with your actual Daily room URL
  
    function isSupported() {
      return typeof window.DailyIframe !== "undefined";
    }
  
    function isActive() {
      return isVoiceActive;
    }
  
    async function startVoiceMode() {
      if (!isSupported()) {
        console.error("Daily.co not loaded");
        return false;
      }
  
      try {
        if (callObject) {
          await callObject.leave();
          callObject.destroy();
        }
  
        callObject = window.DailyIframe.createCallObject({ showLeaveButton: true });
  
        callObject.on("joined-meeting", () => {
          console.log("✅ Joined Daily call successfully");
          isVoiceActive = true;
          updateMicStatus(true);
          playMicSound(true);
          showToast("Voice mode enabled 🎤");
        });
  
        callObject.on("left-meeting", () => {
          console.log("👋 Left the call");
          isVoiceActive = false;
          updateMicStatus(false);
          playMicSound(false);
          showToast("Voice mode disabled 🔇");
        });
  
        await callObject.join({ url: DAILY_ROOM_URL });
        return true;
      } catch (err) {
        console.error("❌ Error starting Daily call:", err);
        updateMicStatus(false);
        playMicSound(false);
        showToast("Failed to start voice mode ❌");
        return false;
      }
    }
  
    async function stopVoiceMode() {
      if (callObject) {
        await callObject.leave();
        isVoiceActive = false;
        updateMicStatus(false);
        playMicSound(false);
        showToast("Voice mode disabled 🔇");
      }
    }
  
    function updateMicStatus(active) {
      const micStatus = document.getElementById("micStatus");
      if (micStatus) {
        micStatus.textContent = active ? "🎤 Voice On" : "🔇 Voice Off";
        micStatus.style.color = active ? "green" : "gray";
      }
    }
  
    function playMicSound(on) {
      const audio = new Audio(on ? "/sounds/mic-on.mp3" : "/sounds/mic-off.mp3");
      audio.play().catch(() => {});
    }
  
    function showToast(message) {
      const toast = document.createElement("div");
      toast.textContent = message;
      toast.style.position = "fixed";
      toast.style.bottom = "20px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.padding = "10px 20px";
      toast.style.backgroundColor = "#222";
      toast.style.color = "#fff";
      toast.style.borderRadius = "6px";
      toast.style.fontSize = "14px";
      toast.style.zIndex = "9999";
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.5s, transform 0.5s";
      toast.style.transform = "translateX(-50%) translateY(20px)";
  
      document.body.appendChild(toast);
  
      requestAnimationFrame(() => {
        toast.style.opacity = "0.95";
        toast.style.transform = "translateX(-50%) translateY(0)";
      });
  
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(20px)";
        setTimeout(() => document.body.removeChild(toast), 500);
      }, 2500);
    }
  
    return {
      isSupported,
      isActive,
      startVoiceMode,
      stopVoiceMode
    };
  })();
  
  // --- Dark Mode Toggle & Mic UI ---
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("darkModeToggle");
    const micButton = document.getElementById("micToggleBtn");
    const micStatus = document.getElementById("micStatus");
    const prefersDark = localStorage.getItem("darkMode") === "enabled";
  
    if (prefersDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      if (toggle) toggle.checked = true;
    }
  
    if (toggle) {
      toggle.addEventListener("change", () => {
        if (toggle.checked) {
          document.documentElement.setAttribute("data-theme", "dark");
          localStorage.setItem("darkMode", "enabled");
        } else {
          document.documentElement.removeAttribute("data-theme");
          localStorage.removeItem("darkMode");
        }
      });
    }
  
    if (micButton) {
      micButton.setAttribute("tabindex", "0");
      micButton.setAttribute("role", "button");
      micButton.setAttribute("aria-pressed", "false");
  
      micButton.addEventListener("click", async () => {
        if (RealtimeAPI.isActive()) {
          await RealtimeAPI.stopVoiceMode();
          micButton.setAttribute("aria-pressed", "false");
        } else {
          await RealtimeAPI.startVoiceMode();
          micButton.setAttribute("aria-pressed", "true");
        }
      });
  
      micButton.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          micButton.click();
        }
      });
    }
  
    // Hide mic UI if not on roleplay page
    const currentPath = window.location.pathname;
    const micUIContainer = document.getElementById("micUIContainer");
    if (micUIContainer && !currentPath.includes("action-flowchart")) {
      micUIContainer.style.display = "none";
    }
  });
  