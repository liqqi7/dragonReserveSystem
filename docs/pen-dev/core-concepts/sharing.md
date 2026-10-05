# Share a design

> 来源：https://docs.pen.dev/core-concepts/sharing（镜像于 2026-10-05，仅供项目内部参考）

# Share a design

Share a link to your design so others can view it in a browser. Use **Update
snapshot** to share changes you make afterward.

## Create a share link[#create-a-share-link](#create-a-share-link)

1. Open the `.pen` document in the desktop app and
  [sign in to pen.dev](https://docs.pen.dev/getting-started/authentication)
2. Select **Share → Create share link**
3. Wait for **Snapshot shared**, then select **Copy link**

Sharing uploads your document and the files it uses, including images and
imported `.pen` libraries. Anyone with the link can view and download the shared
files.

You can close the share dialog while the upload continues. Keep pen.dev running
until it finishes.

If **Missing dependencies** appears, select **Cancel** and restore the listed
files at the paths the document references. Then create the share again.
**Continue anyway** uploads an incomplete snapshot; missing images or libraries
can prevent it from displaying correctly.

## Update the snapshot[#update-the-snapshot](#update-the-snapshot)

After editing the desktop document, select **Share**. When the dialog shows
**New changes since last shared**, select **Update snapshot**. Wait for the upload
to finish. Reviewers can reload the same link to open the updated snapshot.

If the dialog says the file was shared from a different location, check that you
opened the intended document before updating it. You may be editing a copy.

### Share Upload Failed[#share-upload-failed](#share-upload-failed)

If **Share Upload Failed** appears, keep the document open and check your network
connection. Open the share dialog and retry **Create share link** or **Update
snapshot**, as shown. If the dialog says the snapshot may be incomplete, finish
the retry before sending the link to reviewers.

## Revoke the link[#revoke-the-link](#revoke-the-link)

Open **Share**, select **Delete share link**, then select **Confirm deleting the
share link**. This revokes the link. It does not remove copies that recipients
already downloaded.

## Download a shared design[#download-a-shared-design](#download-a-shared-design)

Open the share link and select **Download file**. Extract the ZIP archive and
keep its files together when you open the `.pen` document in pen.dev. Editing
that copy does not change the shared design.

If **Download failed** appears, select **Try again**.
