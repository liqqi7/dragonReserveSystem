const {getBottomContentInsetRpx} = require('../../utils/safeArea');

Component({
  options:{multipleSlots:true},
  properties:{visible:Boolean,title:String,kind:{type:String,value:'info'},size:{type:String,value:'standard'},busy:Boolean,showClose:{type:Boolean,value:true}},
  data:{footerPaddingRpx:null},
  lifetimes:{attached(){this.syncBottomInset();}},
  pageLifetimes:{resize(){this.syncBottomInset();}},
  methods:{
    syncBottomInset(){if(this.renderer === 'webview')this.setData({footerPaddingRpx:getBottomContentInsetRpx()});},
    stop(){},close(){if(!this.data.busy)this.triggerEvent('close');}
  }
});
