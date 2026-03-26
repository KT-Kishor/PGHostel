sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
], function (BaseController, MessageBox, MessageToast, JSONModel) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Document",
        {
            onInit: function () {
                this.getOwnerComponent().getRouter().getRoute("RouteUploadDocs").attachMatched(this._onRouteMatched,
                    this);
            },

            _onRouteMatched: function (oEvent) {
                const CustomerId = oEvent.getParameter("arguments").CustomerId;
                console.log("Customer ID:", CustomerId  );
                const oUploadModel = new JSONModel({
                    attachments: []
                });
                this.getView().setModel(oUploadModel, "UploaderData");
                const oBookingModel = new JSONModel({
                    DocumentType: ""
                });
                this.getView().setModel(oBookingModel, "Bookingmodel");
            },

            BI_onButtonPress: function () {
                this.getOwnerComponent().getRouter().navTo("RouteHostel");
            },

            onFileSelected: function (oEvent) {
                const oFile = oEvent.getParameter("files")[0];
                if (!oFile) return;

                const sDocType = this.getView().getModel("Bookingmodel").getProperty("/DocumentType");
                if (!sDocType) {
                    sap.m.MessageToast.show("Please select Document Type first");
                    oEvent.getSource().clear();
                    return;
                }
                const MAX_SIZE = 2 * 1024 * 1024;
                if (oFile.size > MAX_SIZE) {
                    sap.m.MessageToast.show("File must be less than 2MB.Selected: " +
                        (oFile.size / 1024 / 1024).toFixed(2) + " MB"
                    );
                    oEvent.getSource().clear();
                    return;
                }
                const oModel = this.getView().getModel("UploaderData");
                let aFiles = oModel.getProperty("/attachments")

                if (aFiles.find(file => file.fileType === sDocType)) {
                    sap.m.MessageToast.show("This file type already added");
                    oEvent.getSource().clear();
                    return;
                }
                const oReader = new FileReader();
                oReader.onload = (oLoadEvent) => {
                    const oModel = this.getView().getModel("UploaderData");
                    let aFiles = oModel.getProperty("/attachments") || [];
                    const isDuplicate = aFiles.some(file => file.filename === oFile.name);
                    if (isDuplicate) {
                        sap.m.MessageToast.show("File already added");
                        return;
                    }
                    aFiles.push({
                        filename: oFile.name,
                        fileType: oFile.type,
                        size: oFile.size,
                        documentType: sDocType,
                        content: oLoadEvent.target.result
                    });
                    oModel.setProperty("/attachments", aFiles);
                    oEvent.getSource().clear();
                };
                oReader.readAsDataURL(oFile);
            },
            onpressSave: function () {
                const oModel = this.getView().getModel("UploaderData");
                const aFiles = oModel.getProperty("/attachments");

                if (!aFiles || aFiles.length === 0) {
                    sap.m.MessageToast.show("Please add at least one document");
                    return;
                }

                aFiles.forEach(item => {
                    let Payload = {
                        data: {
                            CustomerId: "C026",
                            DocumentType: item.documentType,
                            FileName: item.filename,
                            FileType: item.fileType,
                            File: item.content   // Base64
                        }
                    };

                    this.ajaxCreateWithJQuery("HM_CustomerDocument", Payload).then(() => {
                        // ;
                    }).catch(() => {
                        sap.m.MessageBox.error("Failed to save document")
                    });
                });
                sap.m.MessageBox.information("Document saved successfully", {
                    title: "Success",
                    actions: [sap.m.MessageBox.Action.OK],
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    styleClass: "myUnifiedBtn",

                    onClose: function (sAction) {

                        if (sAction === sap.m.MessageBox.Action.OK) {
                            this.getOwnerComponent().getRouter().navTo("RouteHostel");

                        }

                    }.bind(this)
                });

            },
             onFileLinkPress: function (oEvent) {

            function autoDecodeBase64(b64) {
                if (!b64) return "";
                b64 = b64.replace(/\s/g, "");
                let last = b64;

                for (let i = 0; i < 5; i++) {
                    try {
                        if (
                            last.startsWith("iVB") ||    // PNG
                            last.startsWith("/9j") ||    // JPG
                            last.startsWith("JVBER")     // PDF
                        ) {
                            return last;
                        }
                        last = atob(last);
                    } catch (e) {
                        break;
                    }
                }
                return last;
            }

            const oDoc = oEvent.getSource()
                .getBindingContext("UploaderData")
                ?.getObject();

            if (!oDoc || !(oDoc.content || oDoc.filename
)) {
                sap.m.MessageToast.show("No document found");
                return;
            }

            const sBase64 = autoDecodeBase64(oDoc.content || oDoc.filename);

            let sMimeType = "application/octet-stream";
            let isPDF = false;

            if (sBase64.startsWith("iVB") || sBase64.includes("image/png")) {
                sMimeType = "image/png";
            } else if (sBase64.startsWith("/9j") || sBase64.includes("image/jpeg")) {
                sMimeType = "image/jpeg";
            } else if (sBase64.startsWith("JVBER") || sBase64.includes("application/pdf")) {
                sMimeType = "application/pdf";
                isPDF = true;
            }

            /* ================= IMAGE PREVIEW ================= */
            if (sMimeType.startsWith("image/")) {

                const sImageSrc = sBase64.includes("data:") ? sBase64 : `data:${sMimeType};base64,${sBase64}`;

                if (!this._oDocPreviewDialog) {

                    const oFlex = new sap.m.FlexBox({
                        width: "100%",
                        height: "100%",
                        justifyContent: "Center",
                        alignItems: "Center",
                        items: [
                            new sap.m.Image({
                                id: this.createId("docPreviewImage"),
                                densityAware: false,
                                width: "100%",
                                height: "100%"
                            })
                        ]
                    });

                    this._oDocPreviewDialog = new sap.m.Dialog({
                        title: oDoc.FileName || "Document Preview",
                        contentWidth: "50%",
                        contentHeight: "60%",
                        draggable: true,
                        resizable: true,
                        contentPadding: "0rem",
                        content: [oFlex],
                        beginButton: new sap.m.Button({
                            text: "Close",
                            press: () => this._oDocPreviewDialog.close()
                        }),
                        afterClose: () => {
                            this._oDocPreviewDialog.destroy();
                            this._oDocPreviewDialog = null;
                        }
                    });

                    this.getView().addDependent(this._oDocPreviewDialog);
                }

                this.byId("docPreviewImage").setSrc(sImageSrc);
                this._oDocPreviewDialog.open();
                return;
            }

            /* ================= PDF PREVIEW ================= */
            if (isPDF) {

                if (!this._oDocPreviewDialog) {
                    this._oDocPreviewDialog = new sap.m.Dialog({
                        title: oDoc.FileName || "Document Preview",
                        stretch: true,
                        draggable: true,
                        resizable: true,
                        contentPadding: "0rem",
                        endButton: new sap.m.Button({
                            text: "Close",
                            press: () => {
                                if (this._previewUrl) {
                                    URL.revokeObjectURL(this._previewUrl);
                                    this._previewUrl = null;
                                }
                                this._oDocPreviewDialog.close();
                            }
                        }),
                        afterClose: () => {
                            this._oDocPreviewDialog.destroy();
                            this._oDocPreviewDialog = null;
                        }
                    });

                    this.getView().addDependent(this._oDocPreviewDialog);
                }

                this._oDocPreviewDialog.removeAllContent();
                let sPdfBase64 = sBase64;
                if (sPdfBase64.includes("base64,")) {
                    sPdfBase64 = sPdfBase64.split("base64,").pop();
                }

                const byteCharacters = atob(sPdfBase64);
                const byteArrays = [];

                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }

                const blob = new Blob(byteArrays, { type: sMimeType });

                if (this._previewUrl) {
                    URL.revokeObjectURL(this._previewUrl);
                }
                this._previewUrl = URL.createObjectURL(blob);

                this._oDocPreviewDialog.addContent(
                    new sap.ui.core.HTML({
                        sanitizeContent: false,
                        content: `
                    <iframe
                        src="${this._previewUrl}"
                        style="width:100%; height:600px; border:none;">
                    </iframe>
                `
                    })
                );

                this._oDocPreviewDialog.open();
                return;
            }

            sap.m.MessageToast.show("Preview not supported");
        },
        });
});