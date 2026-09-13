Component({
  options:{multipleSlots:true},
  properties:{visible:Boolean,title:String,kind:{type:String,value:'info'},size:{type:String,value:'standard'},busy:Boolean},
  methods:{stop(){},close(){if(!this.data.busy)this.triggerEvent('close');}}
});
