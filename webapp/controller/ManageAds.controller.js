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
                MessageToast.show(err.message);
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

        onFacilityFileChange: function(oEvent) {
            let aFiles = oEvent.getParameter("files");

            if (!aFiles) return;

            if (aFiles instanceof FileList) {
                aFiles = Array.from(aFiles);
            } else if (!Array.isArray(aFiles)) {
                aFiles = [aFiles];
            }

            const oUploadModel = this.getView().getModel("UploadModel");
            const oTokenModel = this.getView().getModel("tokenModel");

            let aExistingPhotos = oUploadModel.getProperty("/Photos") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            //  GLOBAL LIMIT CHECK
            if (aExistingPhotos.length + aFiles.length > 2) {
                sap.m.MessageToast.show("You can upload maximum 2 photos only");
                return;
            }

            aFiles.forEach((oFile) => {

                //  Duplicate check
                const bDuplicate = aExistingPhotos.some(photo => photo.name === oFile.name);
                if (bDuplicate) {
                    sap.m.MessageToast.show("File already uploaded: " + oFile.name);
                    return;
                }

                const oReader = new FileReader();

                oReader.onload = (e) => {
                    const base64 = e.target.result.split(",")[1];

                    aExistingPhotos.push({
                        content: base64,
                        type: oFile.type,
                        name: oFile.name
                    });

                    aTokens.push({
                        key: oFile.name,
                        text: oFile.name
                    });

                    oUploadModel.setProperty("/Photos", aExistingPhotos);
                    oTokenModel.setProperty("/tokens", aTokens);
                };

                oReader.readAsDataURL(oFile);
            });
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
                return new sap.m.VBox({
                    alignItems: "Center",
                    justifyContent: "Center",
                    width: "100%",
                    height: "100%",
                    items: [
                        new sap.m.Image({
                            src: oImg.src,
                            densityAware: false,
                            decorative: false,
                            width: "100%",
                            height: "100%"
                        }).addStyleClass("carouselImage")
                    ]
                });
            });

            // Carousel
            var oCarousel = new sap.m.Carousel({
                pages: aPages,
                width: "100%",
                height: "100%",
                showPageIndicator: false
            });

            // Dialog
            var oDialog = new sap.m.Dialog({
                title: "Advertisement Pictures",
                contentWidth: "60%",
                contentHeight: "70%",
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

            oDialog.addStyleClass("ImageDialogNoPadding");
            oDialog.open();
        }
    });
});