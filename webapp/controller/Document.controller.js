sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
], function (BaseController, MessageBox, MessageToast, JSONModel, utils) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Document",
        {
            onInit: function () {
                this.getOwnerComponent().getRouter().getRoute("RouteUploadDocs").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function (oEvent) {
                if (!this._oMemberDialog) {
                    this._oMemberDialog = sap.ui.xmlfragment(
                        this.getView().getId(),
                        "sap.ui.com.project1.fragment.MailDocumentUpload",
                        this
                    );

                    this.getView().addDependent(this._oMemberDialog);
                }

                this._oMemberDialog.open();
                const sEncodedCustomerID = oEvent.getParameter("arguments")?.EncodedCustomerID;
                const sMemberID = oEvent.getParameter("arguments")?.MemberID;


             

                const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

               

                    this._decodedMemberID = atob(sMemberID);

                this.onSearch(this._decodedMemberID)
            

            },

            onFileUpload: function (oEvent) {

                const oFileUploader = oEvent.getSource();

                const oModel = this.getView().getModel("BookingView");

                const oFile = oEvent.getParameter("files") &&
                    oEvent.getParameter("files")[0];

                if (!oFile) {
                    return;
                }

                const iMaxSize = 2 * 1024 * 1024;

                const sDocType = oModel.getProperty(
                    "/NewMemberDraft/Documents/0/DocumentType"
                );

                if (!sDocType) {
                    sap.m.MessageToast.show("Please select document type first");
                    oFileUploader.clear();
                    return;
                }

                // Size validation
                if (oFile.size > iMaxSize) {
                    sap.m.MessageToast.show(oFile.name + " exceeds the 2 MB size limit.");
                    oFileUploader.clear();
                    return;
                }

                const sFileName = oFile.name || "";

                const sExt = sFileName.includes(".") ? sFileName.split(".").pop().toLowerCase() : "";

                const bAllowedExt = [
                    "jpg",
                    "jpeg",
                    "png",
                    "webp",
                    "pdf"
                ].includes(sExt);

                if (!bAllowedExt) {

                    sap.m.MessageToast.show(
                        "Only PDF, JPG, JPEG, PNG, WEBP allowed"
                    );

                    oFileUploader.clear();
                    return;
                }

                const oReader = new FileReader();

                oReader.onload = function (oLoadEvent) {

                    const sBase64 = String(oLoadEvent.target.result || "").split(",")[1] || "";

                    let sNewName = sDocType.toLowerCase().replace(/[^a-z0-9]/g, "_");

                    sNewName += "." + sExt;

                    oModel.setProperty("/NewMemberDraft/Documents/0/FileName", sNewName);
                    oModel.setProperty("/NewMemberDraft/Documents/0/FileType", oFile.type || "");
                    oModel.setProperty("/NewMemberDraft/Documents/0/File", sBase64);
                    oModel.refresh(true);
                };

                oReader.readAsDataURL(oFile);
            },
            onEditMemberFromDialog: function (oEvent) {

                if (!this.MM_Dialog) {

                    var oView = this.getView();

                    this.MM_Dialog = sap.ui.xmlfragment(
                        "sap.ui.com.project1.fragment.Memberadd",
                        this
                    );

                    oView.addDependent(this.MM_Dialog);
                }


                this._mode === "UPDATE"

                var oContext = oEvent.getSource().getBindingContext("BookingView");

                var oData = oContext.getObject();

                // Store selected row path
                this._sEditPath = oContext.getPath();

                // Deep Copy
                var oCopyData = JSON.parse(JSON.stringify(oData));

                // Ensure Documents array exists
                if (!oCopyData.Documents || !oCopyData.Documents.length) {

                    oCopyData.Documents = [{
                        DocumentID: "",
                        DocumentType: "",
                        FileName: "",
                        FileType: "",
                        File: ""
                    }];
                }

                var oRelationCombo = sap.ui.getCore().byId("AD_id_MemberRelationCombo");
                if (oCopyData.Relation === "Self") {
                    oRelationCombo.setValue("Self");
                }

                // Format DOB
                oCopyData.DateOfBirth = oCopyData.DateOfBirth ? oCopyData.DateOfBirth.split("-").reverse().join("/") : "";

                // Set Draft Data
                this.getView().getModel("BookingView").setProperty("/NewMemberDraft", oCopyData);

                // ================= SET CONTROL VALUES =================

                sap.ui.getCore().byId("AD_id_DocumentType").setSelectedKey(oCopyData.Documents[0].DocumentType || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_FileUploader").setValue(oCopyData.Documents[0].FileName || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_MemberDOB").setValue(oCopyData.DateOfBirth || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_MemberGenderCombo").setSelectedKey(oCopyData.Gender || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_MemberRelationCombo").setSelectedKey(oCopyData.Relation || "").setValueState("None");
                sap.ui.getCore().byId("AD_id_MemberName").setValue(oCopyData.Name || "").setValueState("None");
                sap.ui.getCore().byId("AD_idSelect").setSelectedKey(oCopyData.Salutation || "").setValueState("None");

                this.MM_Dialog.open();
            },
            onSaveNewMember: function () {

                var oView = sap.ui.getCore();

                var oMember = this.getView().getModel("BookingView").getProperty("/NewMemberDraft");

                if (utils._LCstrictValidationComboBox(oView.byId("AD_idSelect"), "ID") &&
                    utils._LCvalidateMandatoryField(oView.byId("AD_id_MemberName"), "ID") &&
                    utils._LCvalidateDate(oView.byId("AD_id_MemberDOB"), "ID") &&
                    utils._LCstrictValidationComboBox(oView.byId("AD_id_MemberGenderCombo"), "ID") &&
                    (oMember.Relation === "Self" ||
                        utils._LCstrictValidationComboBox(oView.byId("AD_id_MemberRelationCombo"), "ID")
                    ) && utils._LCstrictValidationComboBox(oView.byId("AD_id_DocumentType"), "ID")
                ) {

                    // ================= DOCUMENT VALIDATION =================

                    if (
                        !oMember.Documents ||
                        !oMember.Documents[0] ||
                        !oMember.Documents[0].DocumentType
                    ) {

                        sap.m.MessageToast.show(
                            "Please select document type"
                        );

                        return;
                    }

                    if (
                        (this._mode === "CREATE" || this._mode === "UPDATE") &&
                        !oMember.Documents[0].File
                    ) {

                        sap.m.MessageToast.show(
                            "Please upload a document"
                        );

                        return;
                    }

                    // ================= MEMBER ID =================

                    if (this._mode === "CREATE") {

                        oMember.MemberID =
                            this._generateMemberID();
                    }

                    // ================= PAYLOAD =================

                    const oPayload = {
                        Members: [{
                            MemberID: oMember.MemberID || "",
                            Salutation: oMember.Salutation,
                            Name: oMember.Name,
                            Relation: oMember.Relation,
                            Gender: oMember.Gender,
                            UserID: oMember.UserID,
                            DateOfBirth: oMember.DateOfBirth ? oMember.DateOfBirth.split("/").reverse().join("-") : "",
                            Documents: [{
                                DocumentID: oMember.Documents?.[0]?.DocumentID || "",
                                MemberID: oMember.MemberID || "",
                                UserID: oMember.UserID || "",
                                DocumentType: oMember.Documents?.[0]?.DocumentType || "",
                                FileName: oMember.Documents?.[0]?.FileName || "",
                                FileType: oMember.Documents?.[0]?.FileType || "",
                                File: oMember.Documents?.[0]?.File || ""
                            }]
                        }]
                    };

                    this._uploadNewMemberDocument(oPayload);

                } else {

                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "fillMandatoryFields"
                        )
                    );
                }
            },
            _uploadNewMemberDocument: function (oDoc) {

                this.getBusyDialog();

                const isCreate =
                    this._mode === "CREATE";

                const oModel = this.getView().getModel("BookingView");

                const oDraft = oModel.getProperty(
                    "/NewMemberDraft"
                );

                const oPromise = isCreate ?
                    this.ajaxCreateWithJQuery(
                        "HM_MemberDocument", {
                        data: [oDoc]
                    }
                    )

                    :
                    this.ajaxUpdateWithJQuery(
                        "HM_MemberDocument", {
                        data: [oDoc],
                        filters: {
                            DocumentID: oDraft.Documents?.[0]?.DocumentID
                        }
                    }
                    );

                oPromise.then(() => {

                    // ================= CREATE =================

                    if (isCreate) {

                        var aMembers =
                            oModel.getProperty("/Members") || [];

                        var oNewMember =
                            JSON.parse(JSON.stringify(oDraft));

                        aMembers.push(oNewMember);

                        oModel.setProperty(
                            "/Members",
                            aMembers
                        );
                    }
                    // ================= UPDATE =================
                    else {
                        if (this._sEditPath) {

                            oModel.setProperty(
                                this._sEditPath,
                                oDraft
                            );
                        }
                    }

                    oModel.refresh(true);

                    this.MM_Dialog.close();

                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "docUploadSuccess"
                        )
                    );

                }).catch(() => {

                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "Error Uploading Documents"
                        )
                    );

                }).finally(() => {

                    this.closeBusyDialog();
                });
            },
            onRemoveButtonPress: function () {

                const oModel = this.getView().getModel("BookingView");
                oModel.setProperty("/NewMemberDraft/Documents/0/FileName", "");
                oModel.setProperty("/NewMemberDraft/Documents/0/FileType", "");
                oModel.setProperty("/NewMemberDraft/Documents/0/File", "");
                oModel.setProperty("/NewMemberDraft/Documents/0/DocumentType", "");
                oModel.refresh(true);

                const oFileUploader = sap.ui.getCore().byId("AD_id_FileUploader");

                if (oFileUploader) {
                    oFileUploader.clear();
                }
            },
          

            onSearch: async function (_decodedMemberID) {
                this.getBusyDialog()
                debugger
              var item =   await this.ajaxReadWithJQuery("HM_MemberDoc", {
                    MemberIDs: [this._decodedMemberID].join(",").replace(/\s+/g, "")
                });

                var aMember = Array.isArray(item.data) ?
                    item.data : [item.data];

                var oMemberModel = new sap.ui.model.json.JSONModel({
                    Members: aMember
                });

                this.getView().setModel(oMemberModel, "BookingView");
                this.closeBusyDialog();
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
                        content: oLoadEvent.target.result.split(',')[1]
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

                if (!this._decodedCustomerID) {
                    sap.m.MessageBox.error("Invalid Customer ID");
                    return;
                }

                aFiles.forEach(item => {
                    let Payload = {
                        data: {
                            CustomerID: this._decodedCustomerID, // ✅ dynamic
                            DocumentType: item.documentType,
                            FileName: item.filename,
                            FileType: item.fileType,
                            File: item.content
                        }
                    };

                    this.ajaxCreateWithJQuery("HM_CustomerDocument", Payload)
                        .catch(() => {
                            sap.m.MessageBox.error("Failed to save document");
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
            MS_viewimagetable: function (oEvent) {
                this.tableview = true
                this.MS_viewimage(oEvent)
            },
            MS_viewimagefragment: function (oEvent) {
                this.tableview = false
                this.MS_viewimage(oEvent)
            },

            MS_viewimage: function (oEvent) {
                let oDraft;
                if (this.tableview === true) {
                    oDraft = oEvent.getSource()
                        .getBindingContext("BookingView")
                        ?.getObject();
                } else {
                    oDraft = this.getView().getModel("BookingView").getProperty("/NewMemberDraft")
                }

                const oDocument = oDraft?.Documents?.[0];

                if (!oDocument?.File) {
                    sap.m.MessageToast.show("No document available");
                    return;
                }

                this._previewDocument({
                    File: oDocument.File || "",
                    Document: oDocument.File || "",
                    Attachment: oDocument.File || "",
                    FileType: oDocument.FileType || "",
                    MimeType: oDocument.FileType || "",
                    FileName: oDocument.FileName || "",
                    DocumentName: oDocument.FileName || ""
                });
            },

            _previewDocument: async function (oDoc) {

                const sRawSource = String(
                    oDoc?.File ||
                    oDoc?.Document ||
                    oDoc?.Attachment ||
                    ""
                ).trim();

                if (!sRawSource) {

                    sap.m.MessageToast.show(
                        "No document to preview."
                    );

                    return;
                }

                const aDataUrlParts =
                    /^data:([^;]+);base64,(.+)$/i.exec(
                        sRawSource
                    );

                const sRawBase64 = aDataUrlParts ?
                    aDataUrlParts[2] :
                    sRawSource;

                const normalizeBase64 = function (sValue) {

                    let sNormalized = String(sValue || "")
                        .replace(/\s/g, "")
                        .replace(/-/g, "+")
                        .replace(/_/g, "/");

                    const iRemainder =
                        sNormalized.length % 4;

                    if (iRemainder) {

                        sNormalized += "=".repeat(
                            4 - iRemainder
                        );
                    }

                    return sNormalized;
                };

                const autoDecodeBase64 = function (sValue) {

                    if (!sValue) {
                        return "";
                    }

                    let current = String(sValue)
                        .replace(/\s/g, "");

                    for (let i = 0; i < 10; i++) {

                        // Already detected encoded file signatures
                        if (
                            current.startsWith("iVB") ||      // PNG
                            current.startsWith("/9j") ||      // JPG
                            current.startsWith("JVBER") ||    // PDF
                            current.startsWith("UklGR")       // WEBP
                        ) {
                            return current;
                        }

                        try {

                            const decoded = atob(current);

                            // RAW PDF bytes
                            if (decoded.startsWith("%PDF")) {
                                return btoa(decoded);
                            }

                            // RAW PNG bytes
                            if (
                                decoded.length > 4 &&
                                decoded.charCodeAt(0) === 137 &&
                                decoded.charCodeAt(1) === 80
                            ) {
                                return btoa(decoded);
                            }

                            // RAW JPEG bytes
                            if (
                                decoded.length > 3 &&
                                decoded.charCodeAt(0) === 255 &&
                                decoded.charCodeAt(1) === 216
                            ) {
                                return btoa(decoded);
                            }

                            current = decoded.replace(/\s/g, "");

                        } catch (e) {

                            console.error("Decode failed:", e);

                            break;
                        }
                    }

                    return current;
                };

                const sBase64 = normalizeBase64(
                    autoDecodeBase64(sRawBase64)
                );

                let sMimeType = String(
                    oDoc.FileType ||
                    oDoc.MimeType ||
                    ""
                ).toLowerCase().trim();

                if (!sMimeType && aDataUrlParts) {

                    sMimeType = String(
                        aDataUrlParts[1] || ""
                    ).toLowerCase();
                }

                // ================= MIME TYPE =================

                if (
                    sMimeType === "pdf" ||
                    sMimeType === ".pdf"
                ) {

                    sMimeType = "application/pdf";

                } else if (
                    sMimeType === "jpg" ||
                    sMimeType === "jpeg" ||
                    sMimeType === ".jpg" ||
                    sMimeType === ".jpeg"
                ) {

                    sMimeType = "image/jpeg";

                } else if (
                    sMimeType === "png" ||
                    sMimeType === ".png"
                ) {

                    sMimeType = "image/png";

                } else if (
                    sMimeType === "webp" ||
                    sMimeType === ".webp"
                ) {

                    sMimeType = "image/webp";
                }

                // ================= AUTO DETECT =================

                if (!sMimeType) {

                    if (sBase64.startsWith("iVB")) {

                        sMimeType = "image/png";

                    } else if (sBase64.startsWith("/9j")) {

                        sMimeType = "image/jpeg";

                    } else if (sBase64.startsWith("UklGR")) {

                        sMimeType = "image/webp";

                    } else if (sBase64.startsWith("JVBER")) {

                        sMimeType = "application/pdf";
                    }
                }


                this._sPreviewFileName = oDoc.FileName || "Document Preview";
                this._sPreviewMimeType = sMimeType;
                this._sPreviewBase64 = sBase64;
                if (this._oPreviewDialog) {
                    this._oPreviewDialog.destroy();
                    this._oPreviewDialog = null;
                }

                // Load Fragment
                if (!this._oPreviewDialog) {

                    this._oPreviewDialog =
                        await sap.ui.core.Fragment.load({

                            id: this.getView().getId(),

                            name: "sap.ui.com.project1.fragment.DocumentPreview",

                            controller: this
                        });

                    this.getView().addDependent(
                        this._oPreviewDialog
                    );
                }

                const oDialog =
                    sap.ui.core.Fragment.byId(
                        this.getView().getId(),
                        "previewDialog"
                    );

                const oImage =
                    sap.ui.core.Fragment.byId(
                        this.getView().getId(),
                        "previewImage"
                    );

                const oHtml =
                    sap.ui.core.Fragment.byId(
                        this.getView().getId(),
                        "previewHtml"
                    );


                oImage.setVisible(false);
                oHtml.setVisible(false);
                oHtml.setContent("");
                if (this._pdfBlobUrl) {

                    URL.revokeObjectURL(
                        this._pdfBlobUrl
                    );

                    this._pdfBlobUrl = null;
                }


                // ================= IMAGE PREVIEW =================



                if (sMimeType.indexOf("image/") === 0) {
                    const sImageSrc = `data:${sMimeType};base64,${sBase64}`;


                    // Create a temporary image to detect orientation and dimensions
                    const oImg = new Image();

                    oImg.onload = function () {

                        const viewportW = window.innerWidth * 0.8;
                        const viewportH = window.innerHeight * 0.8;

                        const imgRatio = oImg.width / oImg.height;

                        let finalWidth = viewportW;
                        let finalHeight = viewportW / imgRatio;

                        if (finalHeight > viewportH) {
                            finalHeight = viewportH;
                            finalWidth = viewportH * imgRatio;
                        }

                        const oHtml = new sap.ui.core.HTML({
                            sanitizeContent: false,
                            content: `
            <div class="preview-image-container">
                <img src="${sImageSrc}" />
            </div>
        `
                        });

                        this._oComplaintPreviewDialog = new sap.m.Dialog({
                            title: oDoc.FileName || "Document Preview",
                            contentWidth: finalWidth + "px",
                            contentHeight: finalHeight + "px",
                            draggable: true,
                            resizable: true,
                            contentPadding: "0rem",
                            horizontalScrolling: false,
                            verticalScrolling: false,
                            content: [oHtml],
                            beginButton: new sap.m.Button({
                                text: "Close",
                                addstyleClass: "myUnifiedBtn",
                                press: () => this._oComplaintPreviewDialog.close()
                            }),
                            afterClose: () => {
                                this._oComplaintPreviewDialog.destroy();
                                this._oComplaintPreviewDialog = null;
                            }
                        });

                        this.getView().addDependent(this._oComplaintPreviewDialog);
                        this._oComplaintPreviewDialog.open();

                    }.bind(this);

                    oImg.src = sImageSrc;
                    return;
                }

                // ================= PDF PREVIEW =================


                if (sMimeType === "application/pdf") {
                    const byteCharacters = atob(sBase64);
                    const byteArrays = [];

                    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                        const slice = byteCharacters.slice(offset, offset + 512);
                        const byteNumbers = new Array(slice.length);
                        for (let i = 0; i < slice.length; i++) {
                            byteNumbers[i] = slice.charCodeAt(i);
                        }

                        byteArrays.push(new Uint8Array(byteNumbers));
                    }

                    const blob = new Blob(byteArrays, { type: "application/pdf" });
                    const sBlobUrl = URL.createObjectURL(blob);
                    this._pdfBlobUrl = sBlobUrl;

                    if (sap.ui.Device.system.phone) {
                        const oLink = document.createElement("a");
                        oLink.href = sBlobUrl;
                        oLink.download = sFileName;
                        document.body.appendChild(oLink);
                        oLink.click();
                        document.body.removeChild(oLink);

                        MessageToast.show("File downloaded successfully");
                        return;
                    }

                    const sIframe = `
                <div style="
                width:100%;
                height:100%;
                overflow:hidden;
                display:flex;
                ">

                <iframe
                src="${sBlobUrl}#toolbar=0&navpanes=0&scrollbar=0"

                style="
                border:none;
                width:100%;
                height:100%;
                display:block;
                overflow:hidden;
                "

                scrolling="auto"
                allowfullscreen>
                </iframe>

                </div>
                `;

                    oDialog.setContentWidth("85%");
                    oDialog.setContentHeight("90%");
                    oHtml.setContent(sIframe);
                    oDialog.setTitle(oDoc.FileName);
                    oHtml.setVisible(true);
                    oDialog.open();
                    return;
                }
                this.onDownloadPreview();
                sap.m.MessageToast.show(
                    "Unsupported document format."
                );
            },
            onCloseNewMemberDialog: function () {
                this.MM_Dialog.close();
            },
            onNewMemberSalutationChange: function (oEvent) {
                const oSalutation = oEvent.getSource();
                const sKey = oSalutation.getSelectedKey();
                const oGender = sap.ui.getCore().byId("AD_id_MemberGenderCombo");
                // Clear salutation error immediately
                oSalutation.setValueState("None");
                if (!oGender) return;
                // Reset gender first
                oGender.setSelectedKey("");
                oGender.setEnabled(true);
                // Auto-map gender
                if (sKey === "Mr.") {
                    oGender.setSelectedKey("Male");
                    oGender.setEnabled(false);
                } else if (sKey === "Ms." || sKey === "Mrs.") {
                    oGender.setSelectedKey("Female");
                    oGender.setEnabled(false);
                }
                // Dr. → manual gender selection

                // Strict validation (CONTROL, not event)
                utils._LCstrictValidationSelect(oSalutation);
            },
            onNewMemberNameChange: function (oEvent) {
                return utils._LCvalidateName(oEvent);
            },
            onNewMemberDOBChange: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            onNewMemberGenderChange: function (oEvent) {
                return utils._LCstrictValidationComboBox(oEvent);
            },
            onNewMemberRelationChange: function (oEvent) {
                return utils._LCstrictValidationComboBox(oEvent);
            },
            onNewMemberDocumentTypeChange: function (oEvent) {

                const oComboBox = oEvent.getSource();

                const sValue = String(oComboBox.getValue() || "").trim();

                if (!sValue) {
                    oComboBox.setSelectedKey("");
                    oComboBox.setValue("");
                    oComboBox.setValueState("None");
                    return true;
                }

                return utils._LCstrictValidationComboBox(oComboBox, "ID");
            },

            OnSubmit: function () {

                var oController = this;

                MessageBox.information("Documents submitted successfully", {
                    title: "Success",
                    actions: [MessageBox.Action.OK],
                    emphasizedAction: MessageBox.Action.OK,
                    styleClass: "myUnifiedBtn",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            oController.getOwnerComponent()
                                .getRouter()
                                .navTo("RouteHostel");
                            if (oController._oMemberDialog) {
                                oController._oMemberDialog.destroy();
                                oController._oMemberDialog = null;
                            }
                        }
                    }
                });


            },
            onMemberSearch: function (oEvent) {
                const sValue = String(oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").trim();
                const oTable = sap.ui.getCore().byId("abmemberSelectTable");
                const oBinding = oTable && oTable.getBinding("items");
                let aFilters = [];

                if (!oBinding) {
                    return;
                }

                if (sValue) {
                    aFilters = [new Filter({
                        filters: [
                            new Filter("Name", FilterOperator.Contains, sValue),
                            new Filter("Relation", FilterOperator.Contains, sValue),
                            new Filter("Gender", FilterOperator.Contains, sValue),
                            new Filter("DocumentType", FilterOperator.Contains, sValue),
                            new Filter("DocumentName", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    })];
                }

                oBinding.filter(aFilters);
            },
        });
});