sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast"
], function(BaseController, utils, MessageBox, Spreadsheet, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.ManageAds", {
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteManageAds").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function() {
            try {
                var LoginFUnction = await this.commonLoginFunction("ManageAmenities");
                if (!LoginFUnction) return;
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                // Main form model
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    URL: "",
                    ID: ""
                }), "NewAdsModel");

                // Upload model
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    Photo1: "",
                    Photo1Type: "",
                    Photo1Name: "",
                    Photo2: "",
                    Photo2Type: "",
                    Photo2Name: ""
                }), "UploadModel");

                // Token model
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    tokens: []
                }), "tokenModel");
                const oEditModel = new sap.ui.model.json.JSONModel();
                this.getView().setModel(oEditModel, "EditAdsModel");

                // this.onClearAndSearch("MA_id_Filterbar");
                await this._loadAds();
                // await this.Onsearch("true");
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        _loadAds: async function() {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();

            this.getBusyDialog()
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_Advertisement");
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                this.getView().setModel(oBranchModel, "NewAdsModel");
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            }
        },

        MA_AddnewAds: function() {
            const oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(),
                    "sap.ui.com.project1.fragment.ManageAds", this);
                oView.addDependent(this.ARD_Dialog);
            }
            oView.getModel("UploadModel").setData({
                Photo1: "",
                Photo1Type: "",
                Photo1Name: "",
                Photo2: "",
                Photo2Type: "",
                Photo2Name: ""
            });

            oView.getModel("tokenModel").setData({
                tokens: []
            });

            this._resetFacilityValueStates();
            this.ARD_Dialog.open();
        },

        MA_EditHostelFeature: function() {
            const oTable = this.byId("MA_id_ManageadsTable");
            const oSelected = oTable.getSelectedItems();

            if (oSelected.length === 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("MSediterr"));
                return;
            }

            if (oSelected.length > 1) {
                MessageToast.show(this.i18nModel.getText("pleaseselectonlyonerowtoedit"));
                return;
            }

            const oData = oSelected[0].getBindingContext("NewAdsModel").getObject();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sap.ui.com.project1.fragment.ManageAds",
                    this
                );
                this.getView().addDependent(this.ARD_Dialog);
            }

            // Set edit model
            this.getView().getModel("EditAdsModel").setData({
                ...oData
            });

            // Load images into upload model
            this.getView().getModel("UploadModel").setData({
                Photo1: oData.Photo1 || "",
                Photo1Type: oData.Photo1Type || "",
                Photo1Name: oData.Photo1Name || "",

                Photo2: oData.Photo2 || "",
                Photo2Type: oData.Photo2Type || "",
                Photo2Name: oData.Photo2Name || ""
            });

            // Add existing files to tokens
            const aTokens = [];

            if (oData.Photo1Name) {
                aTokens.push({
                    key: "Photo1",
                    text: oData.Photo1Name
                });
            }

            if (oData.Photo2Name) {
                aTokens.push({
                    key: "Photo2",
                    text: oData.Photo2Name
                });
            }

            this.getView().getModel("tokenModel").setData({
                tokens: aTokens
            });

            this._resetFacilityValueStates();
            this.ARD_Dialog.open();
        },

        MA_onCancelButtonPress: function() {
            this.ARD_Dialog.close();
            this.byId("MA_id_Url").setValueState("None");
            this.byId("MA_id_ManageadsTable").removeSelections(true);
            this._resetAdsForm()
        },

        onUrlChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        MA_onsavebuttonpress: async function() {
            const oView = this.getView();
            const Payload = oView.getModel("EditAdsModel").getData();
            const oUpload = oView.getModel("UploadModel");
            const aPhotos = oUpload.getProperty("/Photos") || [];

            //  Validation
            var isMandatoryValid = utils._LCvalidateMandatoryField(
                sap.ui.getCore().byId(oView.createId("MA_id_Url")), "ID"
            );

            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // Check existing images from DB
            const bHasExistingImage =
                Payload.Photo1 || Payload.Photo2;

            // Check new uploads
            const bHasNewImage = aPhotos.length > 0;

            // Final validation
            if (!bHasExistingImage && !bHasNewImage) {
                MessageToast.show("Please upload at least 1 image.");
                return;
            }

            this.getBusyDialog();

            try {
                //  Map array → backend fields
                const oPayload = {
                    URL: Payload.URL,

                    Photo1: aPhotos[0]?.content || Payload.Photo1 || "",
                    Photo1Type: aPhotos[0]?.type || Payload.Photo1Type || "",
                    Photo1Name: aPhotos[0]?.name || Payload.Photo1Name || "",

                    Photo2: aPhotos[1]?.content || Payload.Photo2 || "",
                    Photo2Type: aPhotos[1]?.type || Payload.Photo2Type || "",
                    Photo2Name: aPhotos[1]?.name || Payload.Photo2Name || ""
                };

                if (Payload.ID) {
                    //  UPDATE
                    await this.ajaxUpdateWithJQuery("HM_Advertisement", {
                        data: {
                            ID: Payload.ID,
                            ...oPayload
                        },
                        filters: {
                            ID: Payload.ID
                        }
                    });

                    MessageToast.show(this.i18nModel.getText("adUpdatedSuccessfully"));
                    this._resetAdsForm()

                } else {
                    //  CREATE
                    await this.ajaxCreateWithJQuery("HM_Advertisement", {
                        data: oPayload
                    });

                    MessageToast.show(this.i18nModel.getText("adAddedSuccessfully"));
                    this._resetAdsForm()
                }

                this.ARD_Dialog.close();
                await this._loadAds();

            } catch (err) {
                MessageToast.show(err.message || err.responseText || "An error occurred.");
                this.closeBusyDialog()
            } finally {
                this.closeBusyDialog();
            }
        },

        _resetAdsForm: function() {
            this.getView().getModel("EditAdsModel").setData({
                ID: null,
                URL: ""
            });

            this.getView().getModel("UploadModel").setData({
                Photos: []
            });

            this.getView().getModel("tokenModel").setData({
                tokens: []
            });
        },

        onFacilityFileChange: async function(oEvent) {
            let aFiles = oEvent.getParameter("files");
            if (!aFiles) return;

            if (aFiles instanceof FileList) {
                aFiles = Array.from(aFiles);
            } else if (!Array.isArray(aFiles)) {
                aFiles = [aFiles];
            }

            const oFileUploader = this.byId("MA_id_FileUploader");

            for (const oFile of aFiles) {
                const sExt = oFile.name.includes(".") ? oFile.name.split(".").pop().toLowerCase() : "";
                if (!["jpg", "jpeg", "png"].includes(sExt)) {
                    sap.m.MessageToast.show("Only JPG, JPEG, and PNG files are allowed.");
                    if (oFileUploader) oFileUploader.clear();
                    return;
                }
            }

            const oUploadModel = this.getView().getModel("UploadModel");
            const oTokenModel = this.getView().getModel("tokenModel");
            let aExistingPhotos = oUploadModel.getProperty("/Photos") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            if (aExistingPhotos.length + aFiles.length > 2) {
                sap.m.MessageToast.show("You can upload maximum 2 photos only");
                if (oFileUploader) oFileUploader.clear();
                return;
            }

            for (const oFile of aFiles) {
                if (aExistingPhotos.some(photo => photo.originalName === oFile.name)) {
                    sap.m.MessageToast.show("File already uploaded: " + oFile.name);
                    if (oFileUploader) oFileUploader.clear();
                    return;
                }
            }

            const MAX_SIZE_MB = 2;
            let bNeedsCompression = false;

            for (const oFile of aFiles) {
                const fileSizeMB = oFile.size / (1024 * 1024);
                const isImage = oFile.type === "image/jpeg" || oFile.type === "image/jpg" || oFile.type === "image/png";
                if (fileSizeMB > MAX_SIZE_MB && isImage) {
                    bNeedsCompression = true;
                    break;
                }
            }

            if (bNeedsCompression) {
                this.getBusyDialog();
                this._addBusyProcessingRow(aFiles.length);
            }

            const iBaseIndex = aExistingPhotos.length;

            try {
                const aProcessedPhotos = await Promise.all(aFiles.map(async function(oFile, i) {
                    let processedFile = oFile;
                    const fileSizeMB = oFile.size / (1024 * 1024);
                    const isImage = oFile.type === "image/jpeg" || oFile.type === "image/jpg" || oFile.type === "image/png";

                    if (fileSizeMB > MAX_SIZE_MB && isImage) {
                        if (typeof imageCompression === "undefined") {
                            throw new Error("Compression library missing");
                        }
                        const options = {
                            maxSizeMB: 1.9,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true,
                            initialQuality: 0.95
                        };
                        processedFile = await imageCompression(oFile, options);
                    } else if (fileSizeMB > MAX_SIZE_MB && !isImage) {
                        throw new Error("File exceeds 2 MB. Please choose a smaller file.");
                    }

                    const base64 = await new Promise(function(resolve, reject) {
                        const reader = new FileReader();
                        reader.onload = function() { resolve(reader.result.split(",")[1]); };
                        reader.onerror = reject;
                        reader.readAsDataURL(processedFile);
                    });

                    const sExt = oFile.name.includes(".") ? oFile.name.split(".").pop().toLowerCase() : "jpg";
                    const sAdName = "Advertisement " + (iBaseIndex + i + 1) + "." + sExt;

                    return {
                        content: base64,
                        type: "image/jpeg",
                        name: sAdName,
                        originalName: oFile.name
                    };
                }));

                aTokens = oTokenModel.getProperty("/tokens") || [];
                aTokens = aTokens.filter(function(token) {
                    return token.text !== "Compressing...";
                });

                aProcessedPhotos.forEach(function(oPhoto) {
                    aExistingPhotos.push(oPhoto);
                    aTokens.push({
                        key: oPhoto.name,
                        text: oPhoto.name
                    });
                });

                oUploadModel.setProperty("/Photos", aExistingPhotos);
                oTokenModel.setProperty("/tokens", aTokens);

            } catch (err) {
                this.closeBusyDialog();
                sap.m.MessageToast.show(err.message || "Failed to process image.");
            } finally {
                this.closeBusyDialog();
                if (oFileUploader) oFileUploader.clear();
            }
        },

        _addBusyProcessingRow: function(iCount) {
            const oTokenModel = this.getView().getModel("tokenModel");
            let aTokens = oTokenModel.getProperty("/tokens") || [];
            for (let i = 0; i < iCount; i++) {
                aTokens.push({
                    key: "__processing__" + Date.now() + "_" + i,
                    text: "Compressing..."
                });
            }
            oTokenModel.setProperty("/tokens", aTokens);
        },

        onTokenDelete: function(oEvent) {
            const aDeletedTokens = oEvent.getParameter("tokens"); //  correct

            const oUploadModel = this.getView().getModel("UploadModel");
            const oTokenModel = this.getView().getModel("tokenModel");

            let aPhotos = oUploadModel.getProperty("/Photos") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            // Loop through deleted tokens
            aDeletedTokens.forEach((oToken) => {

                const sKey = oToken.getKey();

                //  Remove from photos
                aPhotos = aPhotos.filter(photo => photo.name !== sKey);

                //  Remove from tokens
                aTokens = aTokens.filter(token => token.key !== sKey);
            });

            //  Update models
            oUploadModel.setProperty("/Photos", aPhotos);
            oTokenModel.setProperty("/tokens", aTokens);
        },

        MA_DeleteHostelFeature: async function() {
            var oTable = this.byId("MA_id_ManageadsTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete"));
                return;
            }

            MessageBox.confirm(
                "Are you sure you want to Delete the Selected data?", {
                    icon: MessageBox.Icon.WARNING,
                    title: "Confirm Deletion",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.NO,
                    styleClass: "myUnifiedBtn",

                    onClose: async (sAction) => {

                        if (sAction !== MessageBox.Action.YES) {
                            oTable.removeSelections(true);
                            return;
                        }

                        try {
                            //  OPEN properly
                            this.getBusyDialog();

                            const aDeletePromises = aSelectedItems.map(async (item) => {
                                const oData = item.getBindingContext("NewAdsModel").getObject();

                                await this.ajaxDeleteWithJQuery("HM_Advertisement", {
                                    filters: {
                                        ID: oData.ID
                                    }
                                });
                            });

                            await Promise.all(aDeletePromises);

                            MessageToast.show(this.i18nModel.getText("adDeletedSuccessfully"));

                            oTable.removeSelections(true);

                            //  Refresh table
                            await this._loadAds();

                        } catch (err) {
                            MessageToast.show(err.message || err.responseText);
                        } finally {
                            //  ALWAYS CLOSE
                            this.closeBusyDialog();
                        }
                    }
                }
            );
        },

        _resetFacilityValueStates: function() {
            ["MA_id_Url"].forEach(id => {
                const oField = this.byId(id);
                if (oField) oField.setValueState("None");
            });
        },

        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("NewAdsModel").setData({});
        },

        onHome: function() {
            this.CommonLogoutFunction();
        },

        MA_viewAd: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("NewAdsModel");
            var oData = oContext.getObject();

            // Collect images
            var aImages = [];

            if (oData.Photo1) {
                var sPhoto1 = oData.Photo1.replace(/\s/g, "");

                if (!sPhoto1.startsWith("data:image")) {
                    sPhoto1 = "data:image/jpeg;base64," + sPhoto1;
                }

                aImages.push({
                    src: sPhoto1,
                    name: oData.Photo1Name || "Photo 1"
                });
            }

            if (oData.Photo2) {
                var sPhoto2 = oData.Photo2.replace(/\s/g, "");

                if (!sPhoto2.startsWith("data:image")) {
                    sPhoto2 = "data:image/jpeg;base64," + sPhoto2;
                }

                aImages.push({
                    src: sPhoto2,
                    name: oData.Photo2Name || "Photo 2"
                });
            }

            // No images
            if (aImages.length === 0) {
                sap.m.MessageBox.information(
                    "No image is uploaded.", {
                        title: "Information",
                        styleClass: "myUnifiedBtn"
                    }
                );
                return;
            }

            // Create Carousel Pages
            var aPages = aImages.map(function (oImg) {
                return new sap.m.FlexBox({
                    alignItems: "Center",
                    justifyContent: "Center",
                    renderType: "Bare",
                    width: "100%",
                    height: "100%",
                    items: [
                        new sap.m.Image({
                            src: oImg.src,
                            densityAware: false,
                            decorative: false
                        }).addStyleClass("supportCarouselImage")
                    ]
                }).addStyleClass("supportCarouselImagePage");
            });

            // Carousel
            var oCarousel = new sap.m.Carousel({
                pages: aPages,
                width: "100%",
                height: "100%",
                showPageIndicator: false
            }).addStyleClass("supportImageCarousel");

            // Dialog
            var oDialog = new sap.m.Dialog({
                title: "Advertisement Pictures",
                contentWidth: "80vw",
                contentHeight: "80vh",
                horizontalScrolling: false,
                verticalScrolling: false,
                content: [oCarousel],

                endButton: new sap.m.Button({
                    text: "Close",
                    press: () => {
                         oDialog.close();
                    }
                }).addStyleClass("myUnifiedBtn"),

                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oDialog.addStyleClass("supportImageDialog");
            oDialog.open();
        }
    });
});
