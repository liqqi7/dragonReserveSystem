import os

ROOT = '/tmp/dragonReserveSystem-main-20261007/miniprogram'

# WXML：底栏插入 detail-page 内（</block> 之后），弹窗追加到文件尾
wxml_path = os.path.join(ROOT, 'pages/boardgame_detail/boardgame_detail.wxml')
s = open(wxml_path).read()

old_tail = '</scroll-view></block></view>'
assert old_tail in s, 'detail-page tail not found'
bottom_bar = '</scroll-view></block><view wx:if="{{game && myVersions.length}}" class="detail-bottom-bar"><view class="detail-delete-btn" bindtap="openDeleteDialog" role="button" aria-label="删除我的桌游"><image src="/images/icon-trash-red.svg" mode="aspectFit"/></view><view class="detail-record-btn" bindtap="recordPlay" role="button">记录一局</view></view></view>'
s = s.replace(old_tail, bottom_bar, 1)

dialog = '''<view wx:if="{{deleteDialogOpen}}" class="detail-dialog-mask" bindtap="closeDeleteDialog"><view class="detail-dialog" catchtap="noop"><view class="detail-dialog-head"><image class="detail-dialog-icon" src="/images/icon-alert-red.svg" mode="aspectFit"/><text class="detail-dialog-title">删除我的桌游？</text></view><text class="detail-dialog-desc">{{deleteSoleOwner ? '你是这个桌游的唯一拥有者，卖了就玩不了了，深思吧！' : '你要卖了这个桌游么？'}}</text><view class="detail-dialog-actions"><view class="detail-dialog-cancel" bindtap="closeDeleteDialog">取消</view><view class="detail-dialog-confirm {{deleting ? 'is-disabled' : ''}}" bindtap="confirmDelete">{{deleting ? '删除中…' : '确认'}}</view></view></view></view>
'''
s = s.rstrip('\n') + '\n' + dialog
open(wxml_path, 'w').write(s)
print('wxml patched')

# WXSS
wxss_path = os.path.join(ROOT, 'pages/boardgame_detail/boardgame_detail.wxss')
s = open(wxss_path).read()
if '.detail-bottom-bar' not in s:
    styles = '''
.detail-bottom-bar{flex:none;display:flex;gap:15.38462rpx;padding:11.53846rpx 38.46154rpx calc(46.15385rpx + env(safe-area-inset-bottom));box-sizing:border-box;background:#111827;border-top:1.92308rpx solid #1F2937}
.detail-delete-btn{width:84.61538rpx;height:84.61538rpx;flex:none;display:flex;align-items:center;justify-content:center;background:#1F2937;border-radius:23.07692rpx}
.detail-delete-btn image{display:block;width:38.46154rpx;height:38.46154rpx}
.detail-record-btn{flex:1;height:84.61538rpx;display:flex;align-items:center;justify-content:center;background:#FF9800;border-radius:23.07692rpx;color:#FFFFFF;font-size:26.92308rpx;font-weight:700}
.detail-dialog-mask{position:fixed;left:0;right:0;top:0;bottom:0;z-index:60;background:#00000080;display:flex;align-items:center;justify-content:center}
.detail-dialog{width:576.92308rpx;box-sizing:border-box;background:#FFFFFF;border-radius:30.76923rpx;padding:38.46154rpx;display:flex;flex-direction:column;gap:30.76923rpx;align-items:center}
.detail-dialog-head{display:flex;gap:15.38462rpx;align-items:center;justify-content:center}
.detail-dialog-icon{width:34.61538rpx;height:34.61538rpx}
.detail-dialog-title{color:#111827;font-size:30.76923rpx;font-weight:700}
.detail-dialog-desc{width:100%;color:#4B5563;font-size:26.92308rpx;line-height:1.6}
.detail-dialog-actions{width:100%;display:flex;gap:23.07692rpx}
.detail-dialog-cancel,.detail-dialog-confirm{flex:1;height:84.61538rpx;display:flex;align-items:center;justify-content:center;border-radius:23.07692rpx;font-size:26.92308rpx;font-weight:600}
.detail-dialog-cancel{background:#F5F5F5;color:#4B5563}
.detail-dialog-confirm{background:#EF4444;color:#FFFFFF}
.detail-dialog-confirm.is-disabled{background:#E5E7EB;color:#9CA3AF}
'''
    open(wxss_path, 'w').write(s.rstrip('\n') + '\n' + styles)
print('wxss patched')

# JS
js_path = os.path.join(ROOT, 'pages/boardgame_detail/boardgame_detail.js')
s = open(js_path).read()
old_data = "descriptionOpen:false},"
assert old_data in s, 'data anchor'
if 'deleteDialogOpen' not in s:
    s = s.replace(old_data, "descriptionOpen:false,deleteDialogOpen:false,deleteSoleOwner:false,deleting:false},", 1)

anchor = "    } finally { if(this.current(generation)) this.setData({saving:false}); }\n  }\n});"
assert anchor in s, 'js tail anchor'
methods = """    } finally { if(this.current(generation)) this.setData({saving:false}); }
  },
  noop() {},
  recordPlay() { wx.showToast({title:'记分纸功能开发中', icon:'none'}); },
  openDeleteDialog() {
    if (!this.data.myVersions.length || this.data.deleting) return;
    this.setData({deleteDialogOpen:true, deleteSoleOwner:Number(this.data.ownerCount) <= 1});
  },
  closeDeleteDialog() { if (!this.data.deleting) this.setData({deleteDialogOpen:false}); },
  async confirmDelete() {
    const box = this.data.myVersions[0], generation = this._generation;
    if (!box || this.data.deleting) return;
    this.setData({deleting:true});
    try {
      const result = await api.send(`/boardgame-inventory/${box.id}`, 'DELETE');
      if (!this.current(generation)) return;
      this.setData({deleteDialogOpen:false});
      wx.showToast({title:'已删除', icon:'success'});
      if (Number(result.remaining_owners) > 0) {
        this.load();
      } else if (getCurrentPages().length > 1) {
        wx.navigateBack();
      } else {
        wx.redirectTo({url:'/pages/boardgame_library/boardgame_library'});
      }
    } catch (error) {
      if (this.current(generation)) {
        this.setData({deleteDialogOpen:false});
        wx.showToast({title:api.message(error), icon:'none'});
        if (error.statusCode === 404 || error.statusCode === 409) this.load();
      }
    } finally { if (this.current(generation)) this.setData({deleting:false}); }
  }
});"""
s = s.replace(anchor, methods, 1)
open(js_path, 'w').write(s)
print('js patched')
print('ALL DONE')
