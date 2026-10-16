Component({
  properties: {
    visible: { type: Boolean, value: false },
    avatarUrl: { type: String, value: "" },
    nickname: { type: String, value: "" },
    hint: { type: String, value: "以下内容将公开展示，上传即视为同意" },
    saveDisabled: { type: Boolean, value: false },
    zIndex: { type: Number, value: 1000 }
  },

  methods: {
    close() {
      this.triggerEvent("close");
    },

    chooseAvatar() {
      this.triggerEvent("chooseavatar");
    },

    inputNickname(event) {
      this.triggerEvent("nicknameinput", { value: event.detail.value || "" });
    },

    save() {
      this.triggerEvent("save");
    },

    stopPropagation() {}
  }
});
