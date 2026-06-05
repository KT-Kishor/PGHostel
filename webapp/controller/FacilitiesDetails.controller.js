sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
], function(BaseController, utils, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.FacilitiesDetails", {

        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteFacilitiesDetails").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function(oEvent) {
            try {
                this.getBusyDialog()
                var LoginFUnction = await this.commonLoginFunction("ManageFacility");
                if (!LoginFUnction) return;
                var Layout = this.byId("FD_id_ObjectPageLayout");
                Layout.setSelectedSection(this.byId("FD_id_OrderHeaderSection1"));

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                const oEditableModel = new JSONModel({
                    Edit: false,
                    Save: false
                });
                this.getView().setModel(oEditableModel, "editable"); // Editable control model

                this.byId("FD_id_RoomType123").setValueState("None");
                this.byId("FD_id_FacilityName").setValueState("None");
                this.byId("FD_id_FacilityName1").setValueState("None");
                this.byId("id_SelectionMode").setValueState("None");
                this.byId("FD_id_Currency").setValueState("None");

                const oFacilityModel = new JSONModel({
                    BranchCode: "",
                    Type: "",
                    SelectionMode: "",
                    FacilityName: "",
                    UnitPrice: "",
                    PerHourPrice: "",
                    PerDayPrice: "",
                    PerMonthPrice: "",
                    PerYearPrice: "",
                    Currency: "",
                    FacilityChargeType: ""
                });
                this.getView().setModel(oFacilityModel, "FacilitiesModel"); // Reset facility model
                this.BedID = oEvent.getParameter("arguments").sPath;
                await this._loadBranchCode()
                await this.Onsearch()
                await this._refreshFacilityDetails(this.BedID);
                this.closeBusyDialog()
            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        _loadBranchCode: async function() {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = "";

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode;
            }

            let filters = {};

            if (oExistingModel.Role === "Admin" && aBranchCodes) {
                filters.BranchID = aBranchCodes;
                filters.Role = "Admin";
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchID = "";
            } else {
                filters.BranchID = oExistingModel.BranchCode;
            }
            try {

                const oView = this.getView();

                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);

                const aBranches = Array.isArray(oResponse?.data) ?
                    oResponse.data :
                    (oResponse?.data ? [oResponse.data] : []);

                const oBranchModel = new JSONModel(aBranches);
                oView.setModel(oBranchModel, "BranchModel");

            } catch (err) {
                this.closeBusyDialog()
                MessageToast.show(err.message || err.responseText);
            }
        },

        BI_onEditButtonPress: function() {
            const oView = this.getView();
            oView.getModel("editable").setProperty("/Edit", true);

            const oModel = oView.getModel("DisplayImagesModel");
            let aImages = oModel.getProperty("/DisplayImages") || [];

            // Count actual images (non-placeholder)
            const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;
            oModel.setProperty("/CanAddMore", realImagesCount < 3);

            // Decide how many placeholders to show
            const maxImages = 3; // total slots to show
            let placeholdersNeeded = maxImages - realImagesCount;

            // Remove existing placeholders
            aImages = aImages.filter(img => !img.isPlaceholder);

            // Add required placeholders
            for (let i = 0; i < placeholdersNeeded; i++) {
                aImages.push({
                    isPlaceholder: true
                });
            }

            oModel.setProperty("/DisplayImages", aImages); // Update the model
        },

        BI_onButtonPress: function() {
            // var oRouter = this.getOwnerComponent().getRouter();
            // oRouter.navTo("RouteFacilitis", {
            //     value: "Facilities",
            //     sPath: "FacilitiesDetails"
            // });
            var oViewModel = this.getView().getModel("editable");

            // Check edit mode
            var bIsEditMode = oViewModel.getProperty("/Edit");

            if (bIsEditMode) {

                // Ask confirmation only in edit mode
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    this.i18nModel.getText("backConfirmation"),

                    function() {

                        // Reset edit mode
                        oViewModel.setProperty("/Edit", false);
                        oViewModel.setProperty("/save", false);

                        // Navigate back
                        this.getRouter().navTo("RouteFacilitis", {
                            value: "Facilities",
                            sPath: "FacilitiesDetails"
                        });
                        this.getView().getModel("Facilities").setData({});
                        this.getView().getModel("DisplayImagesModel").setData({});

                    }.bind(this)
                );
            } else {
                // Direct navigation when not editing
                this.getRouter().navTo("RouteFacilitis", {
                    value: "Facilities",
                    sPath: "FacilitiesDetails"
                });
                this.getView().getModel("Facilities").setData({});
                this.getView().getModel("DisplayImagesModel").setData({});
            }

        },

        onFacilitybranchChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFacilityNameChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        _getFacilitySelectionModeMap: function() {
            return {
                1: ["SINGLE"], // High-Speed Wi-Fi
                2: ["PERSON_QTY"], // Laundry Service
                3: ["PERSON_QTY"], // Ironing Service
                4: ["SINGLE"], // Housekeeping
                5: ["PERSON"], // Meals / Food Subscription
                6: ["PERSON"], // Gym Membership
                7: ["SINGLE"], // Two-Wheeler Parking
                8: ["SINGLE"], // Four-Wheeler Parking
                9: ["SINGLE"], // Locker / Storage
                10: ["SINGLE"], // Power Backup
                11: ["SINGLE"], // AC
                12: ["SINGLE"], // Heater
                13: ["PERSON"], // Study Room
                14: ["QTY"], // Extra Bed
                15: ["QTY"], // Extra Pillow
                16: ["SINGLE", "QTY", "PERSON", "PERSON_QTY"] // Others (all allowed)
            };
        },

        onFacilityTypeChange: function(oEvent) {
            var oComboBox = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);

            if (!oComboBox.getValue()) {
                oComboBox.setValueState("None");
            }

            var oSelectedItem = oComboBox.getSelectedItem();
            if (!oSelectedItem) {
                this.byId("id_SelectionMode").unbindItems();
                return;
            }

            var sFacilityID = oSelectedItem.getKey();
            sFacilityID = parseInt(sFacilityID, 10);
            // this._filterSelectionModes(sFacilityID);
            this._syncFacilityPricingFields();
        },

        _filterSelectionModes: function(sFacilityID) {
            var oMap = this._getFacilitySelectionModeMap();
            var aAllowedKeys = oMap[sFacilityID] || [];

            var oComboBox = this.byId("id_SelectionMode");
            var oModel = this.getView().getModel("SelectionModeModel");

            if (!oComboBox || !oModel) return;

            oComboBox.bindItems({
                path: "SelectionModeModel>/",
                template: new sap.ui.core.Item({
                    key: "{SelectionModeModel>key}",
                    text: "{SelectionModeModel>text}"
                }),
                filters: aAllowedKeys.map(function(sKey) {
                    return new sap.ui.model.Filter(
                        "key",
                        sap.ui.model.FilterOperator.EQ,
                        sKey
                    );
                }),
                templateShareable: false
            });

            var oFacilitiesModel = this.getView().getModel("FacilitiesModel");
            var sCurrentMode = oFacilitiesModel.getProperty("/SelectionMode");

            if (!aAllowedKeys.includes(sCurrentMode)) {
                oFacilitiesModel.setProperty("/SelectionMode", "");
            }
        },

        onSelectionModeChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
            this._syncFacilityPricingFields();
        },

        _syncFacilityPricingFields: function() {
            var oModel = this.getView().getModel("FacilitiesModel");
            if (!oModel) return;

            var sSelectionMode = oModel.getProperty("/SelectionMode");

            var bIsUnitPriceMode = sSelectionMode === "PERSON_QTY";

            if (bIsUnitPriceMode) {
                oModel.setProperty("/PerHourPrice", "");
                oModel.setProperty("/PerDayPrice", "");
                oModel.setProperty("/PerMonthPrice", "");
                oModel.setProperty("/PerYearPrice", "");
            } else {
                oModel.setProperty("/UnitPrice", "");
            }
        },

        onFacilityRateChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onPriceChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateAmount(oEvent.getSource(), "ID");
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onDeleteImage: function(oEvent) {
            const oContext = oEvent.getSource().getBindingContext("DisplayImagesModel");
            const sFileName = oContext.getProperty("fileName");
            const oModel = this.getView().getModel("DisplayImagesModel");
            let aImages = oModel.getProperty("/DisplayImages") || [];

            let aRealImages = aImages.filter(img => !img.isPlaceholder);
            aRealImages = aRealImages.filter(img => img.fileName !== sFileName);

            const maxImages = 3;
            const placeholdersNeeded = maxImages - aRealImages.length;

            let aFinalImages = [...aRealImages];

            for (let i = 0; i < placeholdersNeeded; i++) {
                aFinalImages.push({
                    isPlaceholder: true
                });
            }

            oModel.setProperty("/DisplayImages", aFinalImages);
            oModel.setProperty("/CanAddMore", aRealImages.length < maxImages);
        },

        onFileSelected: function(oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) return;

            if (oFile.size > 2 * 1024 * 1024) {
                MessageToast.show(`"${oFile.name}" Exceeds the 2 MB File Size Limit.`);
                return;
            }

            const oReader = new FileReader();
            oReader.onload = (oLoadEvent) => {
                const sBase64 = oLoadEvent.target.result;
                const oModel = this.getView().getModel("DisplayImagesModel");
                let aImages = oModel.getProperty("/DisplayImages") || [];

                const aRealImages = aImages.filter(img => !img.isPlaceholder);
                const bFileNameDuplicate = aRealImages.some(img => img.fileName === oFile.name);
                if (bFileNameDuplicate) {
                    MessageToast.show(`"${oFile.name}" is already Added.`);
                    return;
                }

                const bContentDuplicate = aRealImages.some(img => img.src === sBase64);
                if (bContentDuplicate) {
                    MessageToast.show(this.i18nModel.getText("thisImageisalreadyAdded"));
                    return;
                }

                const iPlaceholderIndex = aImages.findIndex(img => img.isPlaceholder);
                const oNewImage = {
                    src: sBase64,
                    fileName: oFile.name,
                    fileType: oFile.type,
                    isPlaceholder: false
                };

                if (iPlaceholderIndex !== -1) {
                    aImages.splice(iPlaceholderIndex, 1, oNewImage);
                } else {
                    aImages.push(oNewImage);
                }

                const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;
                if (realImagesCount < 3) {
                    if (!aImages.some(img => img.isPlaceholder)) {
                        aImages.push({
                            isPlaceholder: true
                        });
                    }
                } else {
                    aImages = aImages.filter(img => !img.isPlaceholder);
                }

                oModel.setProperty("/DisplayImages", aImages);
            };

            oReader.readAsDataURL(oFile);
        },

        Onsearch: function() {
            this.getBusyDialog()
            this.ajaxReadWithJQuery("HM_ExtraFacilities", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "Facilities")
            })
        },

        onPeriodTypeSelect: function(oEvent) {
            var selectedIndex = oEvent.getParameter("selectedIndex");
            var oFacilityModel = this.getView().getModel("FacilitiesModel");
            var selectedSession = selectedIndex === 0 ? "Daily" : selectedIndex === 1 ? "Entire Booking" : "";
            oFacilityModel.setProperty("/FacilityChargeType", selectedSession); // Set selected session in model
            // Clear value state if a session is selected
            var oRadioGroup = this.getView().byId("id_PeriodSelection");
            if (selectedSession !== "") {
                oRadioGroup.setValueState("None");
            }
        },

        BT_onsavebuttonpress: async function() {
            var oView = this.getView();
            var Payload = oView.getModel("FacilitiesModel").getData();
            var aFacilitiesData = oView.getModel("Facilities").getData();
            var bIsUnit = String(Payload.SelectionMode || "").toUpperCase().trim() === "PERSON_QTY";

            if (
                utils._LCstrictValidationComboBox(oView.byId("FD_id_RoomType123"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("FD_id_FacilityName"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("FD_id_FacilityName1"), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("id_SelectionMode")), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("FD_id_Currency"), "ID")
            ) {

                const sSelectionMode = String(Payload.SelectionMode || "").toUpperCase().trim();
                const isPersonQty = sSelectionMode === "PERSON_QTY";

                const isLaundryOrIroning =
                    Payload.Type === "Laundry Service" ||
                    Payload.Type === "Ironing Service";

                // Require UnitPrice only when NOT PERSON_QTY and is Laundry/Ironing
                if (!isPersonQty && isLaundryOrIroning &&
                    (!Payload.UnitPrice || Number(Payload.UnitPrice) === 0)) {

                    const isValid = utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("FD_id_UnitPrice")), "ID");

                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                }

                if (bIsUnit) {
                    //  PERSON_QTY FLOW
                    if (!utils._LCvalidateMandatoryField(oView.byId("ideditMinimumQuantity"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }

                    if (!Payload.MinimumQty || Number(Payload.MinimumQty) === 0) {
                        MessageToast.show(this.i18nModel.getText("pleaseFillMinimumQty"));
                        return;
                    }

                    var oRadioGroup = sap.ui.getCore().byId(oView.createId("id_PeriodSelection"));
                    if (!Payload.FacilityChargeType || Payload.FacilityChargeType === "") {
                        if (oRadioGroup) oRadioGroup.setValueState("Error");
                        MessageToast.show("Please select Daily or Entire Booking facility Type.");
                        return;
                    } else {
                        if (oRadioGroup) oRadioGroup.setValueState("None");
                    }

                    if (!utils._LCvalidateMandatoryField(oView.byId("ideditMinimumPrice"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }

                    if (!Payload.MinimumPrice) {
                        MessageToast.show(this.i18nModel.getText("pleaseFillMinimumPrice"));
                        return;
                    }

                } else {
                    const isLaundryOrIroning =
                        Payload.Type === "Laundry Service" ||
                        Payload.Type === "Ironing Service";

                    if (
                        !isLaundryOrIroning &&
                        (!Payload.PerHourPrice || Number(Payload.PerHourPrice) === 0) &&
                        (!Payload.PerDayPrice || Number(Payload.PerDayPrice) === 0) &&
                        (!Payload.PerMonthPrice || Number(Payload.PerMonthPrice) === 0) &&
                        (!Payload.PerYearPrice || Number(Payload.PerYearPrice) === 0)
                    ) {
                        MessageToast.show(this.i18nModel.getText("pleaseFillatLeastOnePrice"));
                        return;
                    }
                }

                var attachments = oView.getModel("DisplayImagesModel").getData().DisplayImages || [];

                var uploadedImages = attachments.filter(function(item) {
                    return !item.isPlaceholder;
                });

                if (Payload.Type === "Others") {
                    if (uploadedImages.length === 0) {
                        MessageToast.show(this.i18nModel.getText("youcanuploadamaximumof1imagesonly"));
                        return;
                    }
                } else {
                    if (uploadedImages.length > 3) {
                        MessageToast.show(this.i18nModel.getText("youcanuploadamaximumof3imagesonly"));
                        return;
                    }
                }

                var bDuplicate = aFacilitiesData.some(function(facility) {
                    if (Payload.ID && facility.ID === Payload.ID) return false;

                    return (
                        facility.BranchCode === Payload.BranchCode &&
                        facility.FacilityName.trim().toLowerCase() === Payload.FacilityName.trim().toLowerCase()
                    );
                });

                if (bDuplicate) {
                    MessageToast.show(this.i18nModel.getText("facilitywithSameRatetypeExistsforBranch"));
                    return;
                }

                const toBase64 = (file) => {
                    return new Promise((resolve, reject) => {
                        if (file.src && file.src.startsWith("data:")) {
                            resolve(file.src.split(",")[1]);
                        } else if (file.file && file.file instanceof File) {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result.split(",")[1]);
                            reader.onerror = (error) => reject(error);
                            reader.readAsDataURL(file.file);
                        } else {
                            resolve(null);
                        }
                    });
                };

                try {
                    const convertedImages = await Promise.all(attachments.map(toBase64));

                    const oData = {
                        data: {
                            BranchCode: Payload.BranchCode,
                            FacilityName: Payload.FacilityName,
                            Type: Payload.Type,
                            SelectionMode: Payload.SelectionMode,
                            UnitPrice: (Payload.UnitPrice || 0),
                            MinimumQty: bIsUnit ? (Number(Payload.MinimumQty) || 0) : 0,
                            MinimumPrice: bIsUnit ? (Number(Payload.MinimumPrice) || 0) : 0,
                            PerHourPrice: bIsUnit ? 0 : (Payload.PerHourPrice || 0),
                            PerDayPrice: bIsUnit ? 0 : (Payload.PerDayPrice || 0),
                            PerMonthPrice: bIsUnit ? 0 : (Payload.PerMonthPrice || 0),
                            PerYearPrice: bIsUnit ? 0 : (Payload.PerYearPrice || 0),
                            Currency: Payload.Currency,
                            FacilityChargeType: Payload.FacilityChargeType
                        },
                        Attachment: {
                            FacilityName: Payload.FacilityName,
                            BranchCode: Payload.BranchCode
                        }
                    };

                    attachments.slice(0, 3).forEach((file, index) => {
                        const num = index + 1;

                        oData.Attachment[`Photo${num}`] = convertedImages[index] || "";
                        oData.Attachment[`Photo${num}Name`] = file.fileName || "";
                        oData.Attachment[`Photo${num}Type`] = file.fileType || "";
                    });


                    for (let i = attachments.length + 1; i <= 3; i++) {
                        oData.Attachment[`Photo${i}`] = "";
                        oData.Attachment[`Photo${i}Name`] = "";
                        oData.Attachment[`Photo${i}Type`] = "";
                    }

                    this.getBusyDialog();
                    await this.ajaxUpdateWithJQuery("HM_ExtraFacilities", {
                        data: oData,
                        filters: {
                            ID: Payload.ID
                        }
                    });
                    await this._refreshFacilityDetails(Payload.ID);
                    this.getView().getModel("editable").setProperty("/Edit", false);
                    MessageToast.show(this.i18nModel.getText("facilityUpdatedSuccessfully"));
                } catch (err) {
                    MessageToast.show(err.message || err.responseText);
                } finally {
                    this.closeBusyDialog();
                }
            }
        },

        _refreshFacilityDetails: async function(sFacilityID) {
            try {
                const oData = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {
                    ID: sFacilityID
                });

                const oFacilityDetails = oData?.data?.data?.[0] || {};
                const oImageDetails = oData?.data?.FactDeta?.[0] || {};

                if (!Object.keys(oFacilityDetails).length) {
                    throw new Error("Facility data not found");
                }

                const bIsUnit = String(oFacilityDetails.SelectionMode).toUpperCase() === "PERSON_QTY";

                this.getView().getModel("FacilitiesModel").setData(oFacilityDetails);

                const aDisplayImages = [];
                for (let i = 1; i <= 3; i++) {
                    const sPhoto = oImageDetails[`Photo${i}`];
                    const sName = oImageDetails[`Photo${i}Name`];
                    const sType = oImageDetails[`Photo${i}Type`];
                    if (sPhoto) {
                        aDisplayImages.push({
                            src: `data:${sType || "image/jpeg"};base64,${sPhoto}`,
                            fileName: sName || `Photo${i}`,
                            fileType: sType || "image/jpeg",
                            isPlaceholder: false
                        });
                    }
                }

                const bCanAddMore = aDisplayImages.length < 3;
                this.getView().setModel(new JSONModel({
                    DisplayImages: aDisplayImages,
                    CanAddMore: bCanAddMore
                }), "DisplayImagesModel");

            } catch (err) {
                console.error("Refresh Error:", err);
                MessageToast.show(err.message || "Error while refreshing facility details");
            } finally {
                this.closeBusyDialog();
            }
        },

         onImagePress: function(oEvent) {
            var oSource = oEvent.getSource();
            var sImageSrc = oSource.getSrc();

            var oContext = oSource.getBindingContext("DisplayImagesModel");
            var sFileName = oContext ? oContext.getProperty("fileName") : "Image Preview";

       
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
                        title: sFileName || "Document Preview",
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
    });
});