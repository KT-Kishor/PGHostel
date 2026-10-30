sap.ui.define([
	  "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/base/strings/formatMessage",
    "sap/ui/model/resource/ResourceModel",
    "../model/formatter",
    "sap/ui/core/Fragment",
    "sap/ui/core/util/File",
    "sap/base/security/encodeXML"
], function(
	BaseController,
	JSONModel,
	utils,
	MessageToast,
    formatMessage,
    ResourceModel,
    Formatter,
    Fragment,
    File,
    encodeXML
) {
	"use strict";

    var HEALTH_INSURANCE_MAX_TOTAL_BYTES = 20 * 1024 * 1024;

	return BaseController.extend("sap.ui.com.project1.controller.Healthinsurance", {
		   onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteHealthinsurance").attachMatched(this._onRouteMatched, this);
            this._applyInsuranceLanguage(localStorage.getItem("selectedLanguage") || "en");
            this.getView().setModel(new JSONModel({
                progress: 0,
                barProgress: 0,
                step1Complete: false,
                step2Complete: false,
                step3Complete: false,
                step1State: "active",
                step2State: "pending",
                step3State: "pending",
                submitted: false,
                successMessageKey: "",
                successMessage: ""
            }), "InsuranceUI");

            ["Id_fullName", "Id_email", "ID_mobileNumber", "insurancePlan", "ID_diseases",
                "ID_Weight", "ID_BloodGroup", "idtype", "id_Destination", "id_startDate", "id_endDate"
            ].forEach(function (sId) {
                var oControl = this.byId(sId);
                oControl.attachChange(this._scheduleInsuranceProgressUpdate, this);
                if (oControl.attachLiveChange) {
                    oControl.attachLiveChange(this._scheduleInsuranceProgressUpdate, this);
                }
                if (oControl.attachSelectionFinish) {
                    oControl.attachSelectionFinish(this._scheduleInsuranceProgressUpdate, this);
                }
            }, this);
        },
		_onRouteMatched: function (oEvent) {
            this._releaseInsurancePreviews();

    this.getView().findAggregatedObjects(true, function (oControl) {
        if (oControl.setValueState &&
            typeof oControl.setValueState === "function") {
            oControl.setValueState("None");
        }
            });
            this._applyInsuranceLanguage(localStorage.getItem("selectedLanguage") || "en");
            var oInsuranceUI = this.getView().getModel("InsuranceUI");
            oInsuranceUI.setProperty("/submitted", false);
            oInsuranceUI.setProperty("/successMessageKey", "");
            oInsuranceUI.setProperty("/successMessage", "");

			var oData = {
                totalTravellers: 1,
                currentTravellerIndex: 1,
                currentTraveller: {
                    name: "",
                    passportNo: "",
                    dob: "",
                    passportExpiry: "",
                    attachmentName: ""
                },
                travellersData: []
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
			var sPath = oEvent.getParameter("arguments").sPath;


			var oModel = new JSONModel({
                sPath: sPath,
                memberCount: 1,
                members: [{ dateOfBirth: "" }],
                aadhaarAttachments: [],
                hasAadhaarAttachments: false,
                aadhaarTotalLimitExceeded: false
});
            this.getView().setModel(oModel,"HealthInsuranceModel");
            var oModel = this.getView().getModel("HealthInsuranceModel");
            this.byId("aadhaarUploadedFiles").destroyItems();
            this.byId("aadhaarUploader").clear();
            this._setHealthTotalLimitExceeded(false);

             var oToday = new Date();
             oToday.setHours(0, 0, 0, 0);
             var oDobMinDate = new Date(oToday.getTime());
             oDobMinDate.setFullYear(oToday.getFullYear() - 120);
             oModel.setProperty("/minDate", oToday);
             oModel.setProperty("/dobMinDate", oDobMinDate);
             oModel.setProperty("/dobMaxDate", oToday);
			    var oStepInput = this.byId("memberCount");
			    oStepInput.setEnabled(true).setEditable(true).setMin(1).setMax(6).setValue(1);

    this.onMemberCountChange();
            if(sPath === "Health") {

            }else{
            this.onTravellerCountChange()
            }
            this._ViewDatePickersReadOnly(["id_startDate", "id_endDate"], this.getView());
            this._updateInsuranceProgress();

		},
        _applyInsuranceLanguage: function (sLocale) {
            var oView = this.getView();
            sap.ui.getCore().getConfiguration().setLanguage(sLocale);

            if (!this._oInsuranceI18nModel || this._sInsuranceLocale !== sLocale) {
                var oPreviousModel = this._oInsuranceI18nModel;
                this._oInsuranceI18nModel = new ResourceModel({
                    bundleName: "sap.ui.com.project1.i18n.i18n",
                    bundleLocale: sLocale,
                    async: false
                });
                oView.setModel(this._oInsuranceI18nModel, "i18n");
                this.i18nModel = this._oInsuranceI18nModel.getResourceBundle();
                this._sInsuranceLocale = sLocale;
                if (oPreviousModel) {
                    oPreviousModel.destroy();
                }
            }

            var oLanguageModel = oView.getModel("langageModel");
            if (!oLanguageModel) {
                oLanguageModel = new JSONModel();
                oView.setModel(oLanguageModel, "langageModel");
            }
            oLanguageModel.setProperty("/key", sLocale);

            var oInsuranceUI = oView.getModel("InsuranceUI");
            var sSuccessMessageKey = oInsuranceUI &&
                oInsuranceUI.getProperty("/successMessageKey");
            if (sSuccessMessageKey) {
                oInsuranceUI.setProperty(
                    "/successMessage",
                    this.i18nModel.getText(sSuccessMessageKey)
                );
            }
        },

        _scheduleInsuranceProgressUpdate: function () {
            if (this._bInsuranceProgressUpdateScheduled) {
                return;
            }
            this._bInsuranceProgressUpdateScheduled = true;
            Promise.resolve().then(function () {
                this._bInsuranceProgressUpdateScheduled = false;
                var oView = this.getView();
                if (oView && !oView.isDestroyed()) {
                    this._updateInsuranceProgress();
                }
            }.bind(this));
        },

        _isTravellerNameValid: function (sValue) {
            var sName = String(sValue || "").trim();
            return /^[a-zA-Z\s./]+$/.test(sName) &&
                (sName.match(/[a-zA-Z]/g) || []).length >= 2;
        },

        _isTravellerPassportNumberValid: function (sValue) {
            return /^[A-Z0-9]{5,9}$/.test(String(sValue || "").trim());
        },

        _updateInsuranceProgress: function () {
            var oView = this.getView();
            var oModel = oView.getModel("HealthInsuranceModel");
            if (!oModel) {
                return;
            }

            // Completion is presentation state only; keep it out of the submitted payload.
            var bHealth = oModel.getProperty("/sPath") === "Health";
            var iCount = parseInt(bHealth
                ? oModel.getProperty("/memberCount")
                : oModel.getProperty("/totalTravellers"), 10) || 1;
            var aFirstStep = bHealth
                ? ["Id_fullName", "Id_email", "ID_mobileNumber", "insurancePlan", "ID_diseases", "ID_Weight", "ID_BloodGroup"]
                : ["idtype", "id_Destination", "id_startDate", "id_endDate"];
            var iSecond = 0;
            var iDocuments = 0;
            var aAttachments = oModel.getProperty(bHealth ? "/aadhaarAttachments" : "/passportAttachments") || [];

            for (var i = 1; i <= iCount; i++) {
                if (bHealth) {
                    var oMember = oModel.getProperty("/members/" + (i - 1)) || {};
                    if (String(oMember.dateOfBirth || "").trim()) {
                        iSecond++;
                    }
                } else {
                    var oTraveller = oModel.getProperty("/travellers/" + (i - 1)) || {};
                    if (this._isTravellerNameValid(oTraveller.fullName)) {
                        iSecond++;
                    }
                    if (this._isTravellerPassportNumberValid(oTraveller.passportNumber)) {
                        iSecond++;
                    }
                    if (String(oTraveller.dateOfBirth || "").trim()) {
                        iSecond++;
                    }
                    if (String(oTraveller.passportExpiryDate || "").trim()) {
                        iSecond++;
                    }
                    if (aAttachments.some(function (oAttachment) {
                        return oAttachment && Number(oAttachment.travellerNumber) === i &&
                            !!oAttachment.fileName && !!oAttachment.fileContent;
                    })) {
                        iDocuments++;
                    }
                }
            }

            if (bHealth) {
                iDocuments = aAttachments.some(function (oAttachment) {
                    return oAttachment && !!oAttachment.fileName && !!oAttachment.content;
                }) ? 1 : 0;
            }

            var fnFilled = function (sId) {
                var oControl = oView.byId(sId);
                if (!oControl || (oControl.getValueState && oControl.getValueState() === "Error")) {
                    return false;
                }
                if (oControl.isA && oControl.isA("sap.m.MultiComboBox")) {
                    return oControl.getSelectedKeys().length > 0;
                }
                if (oControl.getDateValue) {
                    return !!String(oControl.getValue() || "").trim() &&
                        (!oControl.isValidValue || oControl.isValidValue());
                }
                if (oControl.isA && oControl.isA("sap.m.ComboBox")) {
                    return !!oControl.getSelectedKey();
                }
                return !!String(oControl.getValue() || "").trim();
            };
            var iFirst = aFirstStep.filter(fnFilled).length;
            var iDocumentTotal = bHealth ? 0 : iCount;
            var iSecondTotal = bHealth ? iCount : iCount * 4;
            var iTotal = aFirstStep.length + iSecondTotal + iDocumentTotal;
            var bStep1Complete = iFirst === aFirstStep.length;
            var bStep2Complete = iSecond === iSecondTotal;
            var bStep3Complete = bHealth
                ? iDocuments > 0
                : iDocuments === iDocumentTotal;
            var bRequiredComplete = bStep1Complete && bStep2Complete;
            var bOptionalDocumentPending = bHealth && bRequiredComplete && !bStep3Complete;
            var oProgressModel = oView.getModel("InsuranceUI");
            var iRequiredFilled = iFirst + iSecond;
            var iRequiredTotal = aFirstStep.length + iSecondTotal;
            var iProgress = Math.min(100, Math.round((iRequiredFilled +
                (bHealth ? 0 : iDocuments)) / iTotal * 100));
            var iBarProgress = bHealth && bRequiredComplete
                ? (bStep3Complete ? 100 : Math.round(iRequiredTotal /
                    (iRequiredTotal + 1) * 100))
                : iProgress;

            oProgressModel.setProperty("/progress", iProgress);
            oProgressModel.setProperty("/barProgress", iBarProgress);
            oProgressModel.setProperty("/step1Complete", bStep1Complete);
            oProgressModel.setProperty("/step2Complete", bStep2Complete);
            oProgressModel.setProperty("/step3Complete", bStep3Complete);
            oProgressModel.setProperty("/step1State", bStep1Complete ? "complete" : "active");
            oProgressModel.setProperty("/step2State", bStep2Complete ? "complete"
                : (bStep1Complete || iSecond > 0 ? "active" : "pending"));
            oProgressModel.setProperty("/step3State", bStep3Complete ? "complete"
                : (bOptionalDocumentPending ? "optional"
                    : (bStep2Complete || iDocuments > 0 ? "active" : "pending")));
        },

        _showInsuranceSuccess: function (sMessageKey) {
            var oInsuranceUI = this.getView().getModel("InsuranceUI");
            this._updateInsuranceProgress();
            oInsuranceUI.setProperty("/successMessageKey", sMessageKey);
            oInsuranceUI.setProperty("/successMessage", this.i18nModel.getText(sMessageKey));
            oInsuranceUI.setProperty("/progress", 100);
            oInsuranceUI.setProperty("/submitted", true);
        },

onhealthSubmitPress: async function () {
    var oView = this.getView();

	   if (
                    !utils._LCvalidateMandatoryField(oView.byId("Id_fullName"), "ID") ||
                    !utils._LCvalidateEmail(oView.byId("Id_email"), "ID") ||
                    !utils._LCvalidateMobileNumber(oView.byId("ID_mobileNumber"), "ID") ||
                    !utils._LCstrictValidationComboBox(oView.byId("insurancePlan"), "ID") ||
                    !utils._LCvalidateMandatoryField(oView.byId("ID_diseases"), "ID") ||
                    !this._validateHealthWeight(oView.byId("ID_Weight")) ||
                    !utils._LCstrictValidationComboBox(oView.byId("ID_BloodGroup"), "ID")

                ) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
                        )
                    );
                    return;
                }
	 
    var oModel = oView.getModel("HealthInsuranceModel");
    var oData = oModel.getData();

    var iCount = parseInt(
        oView.byId("memberCount").getValue(),
        10
    ) || 1;

    var aMembers = [];

    for (var i = 1; i <= iCount; i++) {
        var oDatePicker = this.byId("memberDob" + i);

        if (!oDatePicker || !oDatePicker.getValue()) {
            sap.m.MessageBox.error(
                 this.i18nModel.getText("dobRequired", [i])
            );
            return;
        }

        aMembers.push({
            MemberNumber: i,
            DateOfBirth: oDatePicker.getValue()
        });
    }

    oData.NumberOfMembers = iCount;
    oData.Members = aMembers;

    oModel.setData(oData);
    try {
        this.getBusyDialog();
        await this.ajaxCreateWithJQuery("HM_Health", {
            data: oData
        });

        this._showInsuranceSuccess("healthInsuranceSubmitSuccess");
    } catch (oError) {
        sap.m.MessageBox.error(
            this.i18nModel.getText("healthInsuranceSubmitFailed")
        );
    } finally {
        this.closeBusyDialog();
    }

},
onInputChange:function (oEvent) {
    utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
    this._scheduleInsuranceProgressUpdate();
},
onDateChange: function (oEvent) {
    utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
    var oView = this.getView();
    var oStartDatePicker = oView.byId("id_startDate");
    var oEndDatePicker = oView.byId("id_endDate");

    var sStartDate = oStartDatePicker.getValue();
    var sEndDate = oEndDatePicker.getValue();


    // Read the selected start date
    var oStartDate = oStartDatePicker.getDateValue();

    if (oStartDatePicker.getId() === oEvent.getSource().getId()) {

        // Set minimum end date when start date is selected
        if (oStartDate && !isNaN(oStartDate.getTime())) {
            oEndDatePicker.setMinDate(oStartDate);

            // Clear end date if it is earlier than start date
            var oEndDate = oEndDatePicker.getDateValue();

            if (oEndDate && oEndDate < oStartDate) {
                oEndDatePicker.setValue("");
                this.getView()
                    .getModel("HealthInsuranceModel")
                    .setProperty("/id_endDate", "");
            }
        } else {
            // Remove minimum restriction when start date is cleared
            oEndDatePicker.setMinDate(null);
        }
    }

    // Optional: validate end date is not before start date
    var oCurrentStart = oStartDatePicker.getDateValue();
    var oCurrentEnd = oEndDatePicker.getDateValue();

    if (
        oCurrentStart &&
        oCurrentEnd &&
        oCurrentEnd < oCurrentStart
    ) {
        oEndDatePicker.setValueState("Error");
        oEndDatePicker.setValueStateText(
            "End date must be on or after the start date."
        );
    } else {
        oEndDatePicker.setValueState("None");
    }
    this._scheduleInsuranceProgressUpdate();

},
        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
            this._scheduleInsuranceProgressUpdate();
        },
		onInputMobileChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var bValid = utils._LCvalidateMobileNumber(oEvent);
            this.getView().getModel("HealthInsuranceModel").setProperty(
                "/mobileNumber",
                oInput.getValue()
            );
			this._scheduleInsuranceProgressUpdate();
			return bValid;
		},
        _validateHealthWeight: function (oInput) {
            if (!oInput) {
                return false;
            }
            var sValue = String(oInput.getValue() || "").trim();
            var bValid = /^\d{1,3}(?:\.\d{1,2})?$/.test(sValue) && Number(sValue) > 0;
            oInput.setValueState(bValid ? "None" : "Error");
            return bValid;
        },
        onWeightLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = String(oEvent.getParameter("value") || oInput.getValue() || "")
                .replace(/[^0-9.]/g, "");
            var iDecimalIndex = sValue.indexOf(".");
            if (iDecimalIndex >= 0) {
                var sWhole = sValue.slice(0, iDecimalIndex).slice(0, 3) || "0";
                var sFraction = sValue.slice(iDecimalIndex + 1)
                    .replace(/\./g, "")
                    .slice(0, 2);
                sValue = sWhole + "." + sFraction;
            } else {
                sValue = sValue.slice(0, 3);
            }
            oInput.setValue(sValue);
            this.getView().getModel("HealthInsuranceModel").setProperty(
                "/Weight",
                sValue
            );
            this._validateHealthWeight(oInput);
            this._scheduleInsuranceProgressUpdate();
        },
        onBloodGroupChange:function (oEvent){
          utils._LCstrictValidationComboBox(oEvent);
          this._scheduleInsuranceProgressUpdate();
        },
          onDestinationChange:function (oEvent){
               var oInput = oEvent.getSource();
            utils._LCstrictValidationMultiComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
            this._scheduleInsuranceProgressUpdate();
        },
		onInsurancePlanChange: function (oEvent) {
    utils._LCstrictValidationComboBox(oEvent);

    var oView = this.getView();
    if (oEvent.getSource() === oView.byId("idtype")) {
        this._scheduleInsuranceProgressUpdate();
        return;
    }
    var oMemberCount = oView.byId("memberCount");

    oMemberCount.setEnabled(true).setEditable(true).setMin(1).setMax(6);
    this.onMemberCountChange();
    this._scheduleInsuranceProgressUpdate();
},
	
		onHealthCancelPress: function () {
    var oView = this.getView();
    var oModel = oView.getModel("HealthInsuranceModel");

    // Reset the model
    oModel.setData({
        sPath: "Health",
        aadhaarAttachments: [],
        hasAadhaarAttachments: false,
        aadhaarTotalLimitExceeded: false
    });

    // Reset traveller count to 1
    oView.byId("memberCount").setValue(1);

    // Reset DOB fields to one empty DatePicker
	   var oStepInput = this.byId("memberCount");

    this.onMemberCountChange({
        getParameter: function (sName) {
            return sName === "value" ? oStepInput.getValue() : null;
        }
    });
},
onMemberCountChange: function (oEvent) {
    var oView = this.getView();
    var oContainer = oView.byId("memberDobContainer");
    var oMemberCount = oView.byId("memberCount");
    var oModel = oView.getModel("HealthInsuranceModel");

    var iCount = oEvent
        ? (parseInt(oEvent.getParameter("value"), 10) || 1)
        : (parseInt(oMemberCount.getValue(), 10) || 1);
    iCount = Math.max(1, Math.min(6, iCount));

    if (oMemberCount) {
        oMemberCount.setEnabled(true).setEditable(true).setMin(1).setMax(6);
        oMemberCount.setValue(iCount);
    }
    oModel.setProperty("/memberCount", iCount);

    var aMembers = oModel.getProperty("/members") || [];
    while (aMembers.length < iCount) {
        aMembers.push({ dateOfBirth: "" });
    }
    aMembers = aMembers.slice(0, iCount);
    oModel.setProperty("/members", aMembers);

    oContainer.destroyItems();
    var oGrid = new sap.m.HBox({ renderType: "Bare" }).addStyleClass("svFormGrid");
    var aMemberDatePickerIds = [];

    for (var i = 1; i <= iCount; i++) {
        var oDatePicker = new sap.m.DatePicker(this.createId("memberDob" + i), {
            value: "{HealthInsuranceModel>/members/" + (i - 1) + "/dateOfBirth}",
            placeholder: "{i18n>SelectDOB}",
            displayFormat: "dd/MM/yyyy",
            valueFormat: "yyyy-MM-dd",
            minDate: "{HealthInsuranceModel>/dobMinDate}",
            maxDate: "{HealthInsuranceModel>/dobMaxDate}",
            width: "100%",
            change: this._scheduleInsuranceProgressUpdate.bind(this)
        });
        aMemberDatePickerIds.push("memberDob" + i);

        oGrid.addItem(new sap.m.VBox({
            renderType: "Bare",
            items: [
                new sap.m.Label({
                    text: {
                        parts: [{ path: "i18n>PersonDOB" }, { value: i }],
                        formatter: formatMessage
                    },
                    required: true,
                    wrapping: true,
                    labelFor: oDatePicker.getId()
                }),
                new sap.m.HBox({
                    renderType: "Bare",
                    items: [
                        new sap.ui.core.Icon({ src: "sap-icon://calendar" }).addStyleClass("svFieldIcon"),
                        oDatePicker
                    ]
                }).addStyleClass("svInputShell")
            ]
        }).addStyleClass("svFld"));
    }
    oContainer.addItem(oGrid);
    this._ViewDatePickersReadOnly(aMemberDatePickerIds, oView);
    this._updateInsuranceProgress();
},
formatDialogTitle: function (iCurrentIndex) {
            var iTotal = this.getView().getModel().getProperty("/totalTravellers");
            return "Traveller " + iCurrentIndex + " of " + iTotal + " Details";
        },

        // Open Dialog Fragment
        onOpenTravellerDialog: function () {
            var oView = this.getView();
            var oModel = oView.getModel();

            // Reset tracking data
			var iCount = oModel.getProperty("/totalTravellers") || parseInt(this.byId("memberCount1").getValue(), 10);
            oModel.setProperty("/totalTravellers", iCount);
            oModel.setProperty("/currentTravellerIndex", 1);
            oModel.setProperty("/travellersData", []);
            this._resetCurrentTravellerForm();

            if (!this._pDialog) {
                this._pDialog = sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "sap.ui.com.project1.fragment.TravellerDetails",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        // Capture Selected File
        onFileSelected: function (oEvent) {
            var sFileName = oEvent.getParameter("newValue");
            this.getView().getModel().setProperty("/currentTraveller/attachmentName", sFileName);
        },

        // Next / Submit Button Press
   

        // Reset temporary input values for the next step
        _resetCurrentTravellerForm: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/currentTraveller", {
                name: "",
                passportNo: "",
                dob: "",
                passportExpiry: "",
                attachmentName: ""
            });

            // Clear FileUploader control value if rendered
            var oUploader = this.byId("passportUploader");
            if (oUploader) {
                oUploader.setValue("");
            }
        },

        // Close Dialog
        onCancelDialog: function () {
            this._pDialog.then(function (oDialog) {
                oDialog.close();
            });
        },
onSubmitPress: async function () {
    var oView = this.getView();

    // 1. Validate main travel insurance fields
    if (
        !utils._LCstrictValidationComboBox(
            oView.byId("idtype"), "ID"
        ) ||
        !utils._LCstrictValidationMultiComboBox(
            oView.byId("id_Destination"), "ID"
        ) ||
        !utils._LCvalidateMandatoryField(
            oView.byId("id_startDate"), "ID"
        ) ||
        !utils._LCvalidateMandatoryField(
            oView.byId("id_endDate"), "ID"
        )
    ) {
        sap.m.MessageToast.show(
            this.i18nModel.getText(
                "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
            )
        );
        return;
    }

    // 2. Get model data
    var oHealthModel = oView.getModel("HealthInsuranceModel");

    if (!oHealthModel) {
        sap.m.MessageBox.error("Travel insurance model is not available.");
        return;
    }

    var oHealthData = oHealthModel.getData() || {};
    var aTravellersData = oHealthData.travellers || [];
    var iTotalTravellers =
        parseInt(oHealthData.totalTravellers, 10) || 1;

    if (aTravellersData.length < iTotalTravellers) {
        MessageToast.show(this.i18nModel.getText(
            "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
        ));
        return;
    }

    // 4. Validate each traveller
    for (var i = 0; i < iTotalTravellers; i++) {
        var iTravellerNo = i + 1;

        var oNameInput = oView.byId("travellerFullName" + iTravellerNo);
        var bNameValid = oNameInput && utils._LCvalidateName(oNameInput, "ID");
        if (oNameInput) {
            oHealthModel.setProperty(
                "/travellers/" + i + "/fullName",
                oNameInput.getValue()
            );
        }
        if (!bNameValid) {
            MessageToast.show(this.i18nModel.getText(
                "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
            ));
            return;
        }

        var oPassportInput = oView.byId("travellerPassportNumber" + iTravellerNo);
        var bPassportValid = this._validateTravellerPassportControl(oPassportInput, true);
        if (oPassportInput) {
            oHealthModel.setProperty(
                "/travellers/" + i + "/passportNumber",
                oPassportInput.getValue()
            );
        }
        if (!bPassportValid) {
            MessageToast.show(this.i18nModel.getText(
                "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
            ));
            return;
        }

        var oDobPicker = oView.byId("travellerDob" + iTravellerNo);
        var bDobValid = this._validateTravellerDatePicker(oDobPicker, true);
        if (!bDobValid) {
            MessageToast.show(this.i18nModel.getText(
                "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
            ));
            return;
        }

        var oExpiryPicker = oView.byId("travellerPassportExpiry" + iTravellerNo);
        var bExpiryValid = this._validateTravellerDatePicker(oExpiryPicker, true);
        if (!bExpiryValid) {
            MessageToast.show(this.i18nModel.getText(
                "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
            ));
            return;
        }

        // Passport Attachment
      // Passport Attachment validation
// Passport Attachment validation
var vAttachments = oHealthData.passportAttachments || [];
var aAttachments = [];

// Handle array or single object
if (Array.isArray(vAttachments)) {
    aAttachments = vAttachments;
} else if (typeof vAttachments === "object") {
    aAttachments = [vAttachments];
}

// If the first element contains an attachment array, unwrap it
if (
    aAttachments.length === 1 &&
    Array.isArray(aAttachments[0])
) {
    aAttachments = aAttachments[0];
}

var bHasAttachment = aAttachments.some(function (oAttachment) {
    return Number(oAttachment.travellerNumber) === iTravellerNo &&
        !!oAttachment.fileContent &&
        !!oAttachment.fileName;
});

        if (!bHasAttachment) {
            MessageToast.show(this.i18nModel.getText(
                "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
            ));
            return;
        }
    }

    // 5. Prepare complete payload
    var oCompletePayload = {
        type: oHealthData.insurancePlan,
        destination: oView.byId("id_Destination").getSelectedKeys(),
        startDate: oHealthData.startDate,
        endDate: oHealthData.endDate,
        totalTravellers: iTotalTravellers,
        travellersData: aTravellersData,
        passportAttachments: oHealthData.passportAttachments || [],
        Name:this.getOwnerComponent().getModel("LoginModel").getData().UserName,
        EmailID:this.getOwnerComponent().getModel("LoginModel").getData().EmailID
    };

    console.log(
        "Complete Form Payload:",
        oCompletePayload
    );

    // 6. Submit data
    try {
        this.getBusyDialog();

        await this.ajaxCreateWithJQuery("HM_Travel", {
            data: oCompletePayload
        });

        this._showInsuranceSuccess("travelInsuranceSubmitSuccess");

    } catch (oError) {
        console.error(
            "Travel insurance submission failed:",
            oError
        );

        sap.m.MessageBox.error(
            "Unable to submit the travel insurance application. " +
            "Please try again."
        );

    } finally {
        this.closeBusyDialog();
    }
},
onNavBack: function () {
    var oBundle = this.getView()
        .getModel("i18n")
        .getResourceBundle();

    var sOkButton = oBundle.getText("OkButton");
    var sCancelButton = oBundle.getText("adminBookingCancel");

    sap.m.MessageBox.information(
        oBundle.getText("Areyousurewanttoexitthepage"),
        {
            title: oBundle.getText("confirmCancellation"),

            actions: [sOkButton, sCancelButton],

            emphasizedAction: sOkButton,

            onClose: function (sAction) {
                if (sAction === sOkButton) {
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo("RouteHostel");
                }
            }.bind(this),

            styleClass: "myUnifiedBtn"
        }
    );
},


_isInsuranceDocumentAllowed: function (oFile) {
    var sExtension = (oFile.name.split(".").pop() || "").toLowerCase();
    var aAllowedExtensions = ["pdf", "png", "jpg", "jpeg"];
    var aAllowedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

    return aAllowedExtensions.indexOf(sExtension) !== -1 &&
        (!oFile.type || aAllowedMimeTypes.indexOf(oFile.type) !== -1);
},

_prepareInsuranceDocument: async function (oFile) {
    var iMaxBytes = 400 * 1024;
    var bImage = /\.(jpe?g|png)$/i.test(oFile.name) ||
        ["image/jpeg", "image/jpg", "image/png"].indexOf(oFile.type) !== -1;

    if (!oFile.size) {
        throw Object.assign(new Error("Empty file"), { i18nKey: "vrErrEmptyFile" });
    }
    if (oFile.size <= iMaxBytes) {
        return oFile;
    }
    if (!bImage) {
        throw Object.assign(new Error("File size limit exceeded"), {
            i18nKey: "fileExceeds400KB",
            i18nArgs: [oFile.name],
            flash: true,
            highlightLimit: true
        });
    }
    if (typeof imageCompression === "undefined") {
        throw Object.assign(new Error("Compression library missing"), {
            i18nKey: "Compressionlibrarynotavailable"
        });
    }

    var oProcessedFile;
    try {
        oProcessedFile = await imageCompression(oFile, {
            maxSizeMB: (400 - 10) / 1024,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            initialQuality: 0.95
        });
    } catch (oError) {
        throw Object.assign(new Error("File compression failed"), {
            i18nKey: "insuranceCompressionFailed",
            i18nArgs: [oFile.name],
            flash: true,
            highlightLimit: true
        });
    }

    if (oProcessedFile.size > iMaxBytes) {
        throw Object.assign(new Error("File compression failed"), {
            i18nKey: "insuranceCompressionFailed",
            i18nArgs: [oFile.name],
            flash: true,
            highlightLimit: true
        });
    }
    return oProcessedFile;
},

_readInsuranceDocument: function (oFile) {
    return new Promise(function (resolve, reject) {
        var oReader = new FileReader();
        oReader.onload = function (oEvent) {
            resolve(oEvent.target.result.split(",")[1]);
        };
        oReader.onerror = function () {
            reject(Object.assign(new Error("File read failed"), { i18nKey: "vrErrReadFile" }));
        };
        oReader.readAsDataURL(oFile);
    });
},

_getInsuranceUploadHint: function (oUploader) {
    if (!oUploader) {
        return null;
    }
    var sUploaderId = oUploader.getId();
    if (/aadhaarUploader$/.test(sUploaderId)) {
        return this.byId("aadhaarUploadHint");
    }
    var aMatch = sUploaderId.match(/passportUploader(\d+)$/);
    return aMatch ? this.byId("passportUploadHint" + aMatch[1]) : null;
},

_setInsuranceSizeHintError: function (oUploader, bError) {
    var oHint = this._getInsuranceUploadHint(oUploader);
    if (oHint) {
        oHint.toggleStyleClass("insuranceFileHintError", !!bError);
    }
},

_setHealthTotalLimitExceeded: function (bExceeded) {
    var oModel = this.getView().getModel("HealthInsuranceModel");
    if (oModel) {
        oModel.setProperty("/aadhaarTotalLimitExceeded", !!bExceeded);
    }
},

_showInsuranceUploadError: function (oError, oUploader) {
    var oBundle = this.getView().getModel("i18n").getResourceBundle();
    oError = oError || {};
    var sMessage = oBundle.getText(
        oError.i18nKey || "vrErrReadFile",
        oError.i18nArgs || []
    );
    if (oError.highlightLimit) {
        this._setInsuranceSizeHintError(oUploader, true);
    }
    if (oError.flash) {
        MessageToast.show(sMessage);
    } else {
        sap.m.MessageBox.error(sMessage);
    }
},

onFileSelected: async function (oEvent) {
    var oUploader = oEvent.getSource();
    var oFile = (oEvent.getParameter("files") || [])[0];
    this._setInsuranceSizeHintError(oUploader, false);

    if (!oFile) {
        return;
    }
    if (!this._isInsuranceDocumentAllowed(oFile)) {
        this._showInsuranceUploadError({ i18nKey: "vrErrDocType" });
        oUploader.clear();
        return;
    }

    var oView = this.getView();
    var oModel = oView.getModel("HealthInsuranceModel");
    var sUploaderId = oUploader.getId();
    var iTravellerIndex = parseInt(
        sUploaderId.split("passportUploader")[1],
        10
    ) - 1;
    var oTraveller = oModel.getProperty("/travellers/" + iTravellerIndex);
    var fnIsCurrentTraveller = function () {
        return !oView.isDestroyed() &&
            oView.getModel("HealthInsuranceModel") === oModel &&
            iTravellerIndex < oModel.getProperty("/totalTravellers") &&
            oModel.getProperty("/travellers/" + iTravellerIndex) === oTraveller;
    };
    var oExistingAttachment = oModel.getProperty("/passportAttachments/" + iTravellerIndex);
    if (oExistingAttachment && oExistingAttachment.fileName === oFile.name &&
        (!oExistingAttachment.originalSize || oExistingAttachment.originalSize === oFile.size)) {
        MessageToast.show(this.getView().getModel("i18n").getResourceBundle()
            .getText("thisfilealreadyuploaded"));
        oUploader.clear();
        return;
    }
    var oDropZone = oUploader.getParent();
    oDropZone.setBusyIndicatorDelay(0).setBusy(true);

    try {
        var oProcessedFile = await this._prepareInsuranceDocument(oFile);
        if (!fnIsCurrentTraveller()) {
            return;
        }
        var sBase64Content = await this._readInsuranceDocument(oProcessedFile);
        if (!fnIsCurrentTraveller()) {
            return;
        }
        var aAttachments = oModel.getProperty("/passportAttachments") || [];
        if (aAttachments[iTravellerIndex]) {
            this._releaseInsurancePreviews(aAttachments[iTravellerIndex]);
        }
        aAttachments[iTravellerIndex] = {
            travellerNumber: iTravellerIndex + 1,
            fileName: oFile.name,
            fileType: oProcessedFile.type || oFile.type,
            fileSize: oProcessedFile.size,
            originalSize: oFile.size,
            fileContent: sBase64Content
        };

        oModel.setProperty("/passportAttachments", aAttachments);
        this._renderPassportAttachment(iTravellerIndex + 1);
        this._updateInsuranceProgress();
    } catch (oError) {
        if (fnIsCurrentTraveller()) {
            this._showInsuranceUploadError(oError, oUploader);
        }
    } finally {
        if (!oDropZone.isDestroyed()) {
            oDropZone.setBusy(false);
        }
        if (!oUploader.isDestroyed()) {
            oUploader.clear();
        }
    }
},

onInsuranceFileTypeMismatch: function (oEvent) {
    var oBundle = this.getView().getModel("i18n").getResourceBundle();
    this._setInsuranceSizeHintError(oEvent.getSource(), false);
    this._setHealthTotalLimitExceeded(false);
    sap.m.MessageBox.error(oBundle.getText("vrErrDocType"));
    oEvent.getSource().clear();
},

onAadhaarAttachmentChange: async function (oEvent) {
    var oView = this.getView();
    var oModel = oView.getModel("HealthInsuranceModel");
    var aFiles = Array.from(oEvent.getParameter("files") || []);
    var aAttachments = oModel.getProperty("/aadhaarAttachments") || [];
    var oFileList = oView.byId("aadhaarUploadedFiles");
    var oUploader = oEvent.getSource();
    var oDropZone = oUploader.getParent();
    var oBundle = oView.getModel("i18n").getResourceBundle();
    this._setInsuranceSizeHintError(oUploader, false);
    this._setHealthTotalLimitExceeded(false);

    if (!aFiles.length) {
        return;
    }
    oDropZone.setBusyIndicatorDelay(0).setBusy(true);

    try {
        for (var i = 0; i < aFiles.length; i++) {
            var oFile = aFiles[i];
            var bExists = aAttachments.some(function (oItem) {
                return oItem.fileName === oFile.name &&
                    (!oItem.originalSize || oItem.originalSize === oFile.size);
            });
            if (bExists) {
                MessageToast.show(oBundle.getText("thisfilealreadyuploaded"));
                continue;
            }
            if (!this._isInsuranceDocumentAllowed(oFile)) {
                this._showInsuranceUploadError({ i18nKey: "vrErrDocType" });
                continue;
            }

            try {
                var oProcessedFile = await this._prepareInsuranceDocument(oFile);
                var iCurrentTotal = aAttachments.reduce(function (iSum, oAttachment) {
                    return iSum + (Number(oAttachment.fileSize) || 0);
                }, 0);
                if (iCurrentTotal + oProcessedFile.size > HEALTH_INSURANCE_MAX_TOTAL_BYTES) {
                    MessageToast.show(oBundle.getText(
                        "insuranceHealthTotalLimitExceeded",
                        [oFile.name]
                    ));
                    this._setHealthTotalLimitExceeded(true);
                    continue;
                }
                var sBase64 = await this._readInsuranceDocument(oProcessedFile);
                var oAttachment = {
                    id: Date.now() + "_" + Math.random().toString(36).slice(2),
                    fileName: oFile.name,
                    mimeType: oProcessedFile.type || oFile.type,
                    fileSize: oProcessedFile.size,
                    originalSize: oFile.size,
                    content: sBase64
                };

                aAttachments = aAttachments.concat(oAttachment);
                oModel.setProperty("/aadhaarAttachments", aAttachments);
                oModel.setProperty("/hasAadhaarAttachments", aAttachments.length > 0);

                var oRow = this._createInsuranceFileRow(
                    oAttachment,
                    this.onRemoveAadhaarAttachment.bind(this, oAttachment.id)
                );

                oRow.data("attachmentId", oAttachment.id);
                oFileList.addItem(oRow);
                this._updateInsuranceProgress();
            } catch (oFileError) {
                this._showInsuranceUploadError(oFileError, oUploader);
            }
        }
    } finally {
        oDropZone.setBusy(false);
        oUploader.clear();
    }
},

onRemoveAadhaarAttachment: function (sAttachmentId) {
    var oView = this.getView();
    var oModel = oView.getModel("HealthInsuranceModel");
    var aAttachments = oModel.getProperty("/aadhaarAttachments") || [];
    var oFileList = oView.byId("aadhaarUploadedFiles");

    var oAttachment = aAttachments.find(function (oItem) {
        return oItem.id === sAttachmentId;
    });
    if (oAttachment) {
        this._releaseInsurancePreviews(oAttachment);
    }
    aAttachments = aAttachments.filter(function (oItem) {
        return oItem.id !== sAttachmentId;
    });

    oModel.setProperty("/aadhaarAttachments", aAttachments);
    oModel.setProperty("/hasAadhaarAttachments", aAttachments.length > 0);
    this._setHealthTotalLimitExceeded(false);

    // Remove only the selected file's row
    oFileList.getItems().slice().forEach(function (oRow) {
        if (oRow.data("attachmentId") === sAttachmentId) {
            oFileList.removeItem(oRow);
            oRow.destroy();
        }
    });
    this._updateInsuranceProgress();
},

_createInsuranceFileRow: function (oAttachment, fnRemove) {
    return new sap.m.HBox({
        renderType: "Bare",
        width: "100%",
        alignItems: "Center",
        items: [
            new sap.ui.core.Icon({ src: "sap-icon://document-text" }).addStyleClass("svFileIcon"),
            new sap.m.VBox({
                renderType: "Bare",
                items: [
                    new sap.m.Text({
                        text: oAttachment.fileName,
                        tooltip: oAttachment.fileName,
                        wrapping: false
                    }).addStyleClass("svFileName"),
                    new sap.m.Text({
                        text: Formatter.formatFileSize(oAttachment.fileSize)
                    }).addStyleClass("svFileSub")
                ]
            }).addStyleClass("svFileMeta"),
            new sap.m.Link({
                text: "{i18n>vrDocView}",
                tooltip: "{i18n>vrDocView}",
                press: this._previewInsuranceAttachment.bind(this, oAttachment)
            }).addStyleClass("tealTextLink svDocView"),
            new sap.m.Button({
                icon: "sap-icon://delete",
                tooltip: "{i18n>vrDocRemove}",
                type: "Transparent",
                press: fnRemove
            }).addStyleClass("svDocAction svRemoveBtn myUnifiedBtn")
        ]
    }).addStyleClass("svFileRow");
},

_renderPassportAttachment: function (iTravellerNumber) {
    var oFileList = this.byId("passportUploadedFiles" + iTravellerNumber);
    if (!oFileList) {
        return;
    }
    oFileList.destroyItems();
    var oAttachment = this.getView().getModel("HealthInsuranceModel")
        .getProperty("/passportAttachments/" + (iTravellerNumber - 1));
    if (oAttachment && oAttachment.fileName) {
        oFileList.addItem(this._createInsuranceFileRow(
            oAttachment,
            this.onRemovePassportAttachment.bind(this, iTravellerNumber)
        ));
    }
},

onRemovePassportAttachment: function (iTravellerNumber) {
    var oModel = this.getView().getModel("HealthInsuranceModel");
    var sPath = "/passportAttachments/" + (iTravellerNumber - 1);
    var oAttachment = oModel.getProperty(sPath);
    if (oAttachment) {
        this._releaseInsurancePreviews(oAttachment);
    }
    // Keep array positions stable so another traveller's document cannot shift here.
    oModel.setProperty(sPath, {});
    this.byId("passportUploader" + iTravellerNumber).clear();
    this._renderPassportAttachment(iTravellerNumber);
    this._updateInsuranceProgress();
},

_previewInsuranceAttachment: async function (oAttachment) {
    var oView = this.getView();
    var sBase64 = oAttachment.content || oAttachment.fileContent || "";
    var sMimeType;
    if (sBase64.indexOf("iVBORw0KGgo") === 0) {
        sMimeType = "image/png";
    } else if (sBase64.indexOf("/9j/") === 0) {
        sMimeType = "image/jpeg";
    } else if (sBase64.indexOf("JVBERi0") === 0) {
        sMimeType = "application/pdf";
    } else {
        MessageToast.show(this.i18nModel.getText("Previewnotsupportedforthisfiletype"));
        return;
    }

    // Only detected PDF/PNG/JPEG content is rendered, never uploaded HTML or SVG.
    if (!this._mInsurancePreviews) {
        this._mInsurancePreviews = new Map();
    }
    var oPreview = this._mInsurancePreviews.get(oAttachment);
    if (!oPreview) {
        try {
            var sBinary = atob(sBase64);
            var aBytes = Uint8Array.from(sBinary, function (sCharacter) {
                return sCharacter.charCodeAt(0);
            });
            var oBlob = new Blob([aBytes], { type: sMimeType });
            oPreview = {
                blob: oBlob,
                url: URL.createObjectURL(oBlob),
                mimeType: sMimeType
            };
            this._mInsurancePreviews.set(oAttachment, oPreview);
        } catch (oError) {
            MessageToast.show(this.i18nModel.getText("previewunavailable"));
            return;
        }
    }

    this._oInsurancePreviewAttachment = oAttachment;
    this._oInsurancePreviewDocument = oPreview;
    var oDialog;
    try {
        if (!this._pInsurancePreviewDialog) {
            this._pInsurancePreviewDialog = Fragment.load({
                id: oView.getId(),
                name: "sap.ui.com.project1.fragment.DocumentPreview",
                controller: this
            }).then(function (oLoadedDialog) {
                if (oView.isDestroyed()) {
                    oLoadedDialog.destroy();
                    return null;
                }
                oView.addDependent(oLoadedDialog);
                this._oInsurancePreviewDialog = oLoadedDialog;
                oLoadedDialog.attachAfterClose(function () {
                    var oClosedAttachment = this._oInsurancePreviewAttachment;
                    this._oInsurancePreviewAttachment = null;
                    this._oInsurancePreviewDocument = null;
                    var oImage = this.byId("previewImage");
                    var oHtml = this.byId("previewHtml");
                    if (oImage) {
                        oImage.setSrc("").setVisible(false);
                    }
                    if (oHtml) {
                        oHtml.setContent("").setVisible(false);
                    }
                    if (oClosedAttachment) {
                        this._releaseInsurancePreviews(oClosedAttachment);
                    }
                }, this);
                return oLoadedDialog;
            }.bind(this));
        }
        oDialog = await this._pInsurancePreviewDialog;
    } catch (oError) {
        this._pInsurancePreviewDialog = null;
        this._releaseInsurancePreviews(oAttachment);
        if (!oView.isDestroyed()) {
            MessageToast.show(this.i18nModel.getText("previewunavailable"));
        }
        return;
    }

    if (!oDialog || this._oInsurancePreviewAttachment !== oAttachment) {
        this._releaseInsurancePreviews(oAttachment);
        return;
    }

    var oImage = this.byId("previewImage");
    var oHtml = this.byId("previewHtml");
    oDialog.setTitle(oAttachment.fileName);
    oImage.setVisible(false).setSrc("");
    oHtml.setVisible(false).setContent("");
    if (sMimeType === "application/pdf") {
        var sPdfUrl = encodeXML(oPreview.url + "#toolbar=0&navpanes=0");
        var sTitle = encodeXML(this.i18nModel.getText("documentPreview"));
        oHtml.setContent('<div style="width:100%;height:100%;display:flex;overflow:hidden;">' +
            '<iframe src="' + sPdfUrl + '" title="' + sTitle + '" ' +
            'style="width:100%;height:100%;border:0;display:block;"></iframe></div>');
        oHtml.setVisible(true);
    } else {
        oImage.setSrc(oPreview.url).setVisible(true);
    }
    oDialog.open();
},

onDownloadPreview: function () {
    var oAttachment = this._oInsurancePreviewAttachment;
    var oPreview = this._oInsurancePreviewDocument;
    if (!oAttachment || !oPreview) {
        MessageToast.show(this.i18nModel.getText("Nofileavailablefordownload"));
        return;
    }
    var sFileName = oAttachment.fileName;
    var iDot = sFileName.lastIndexOf(".");
    var sName = iDot >= 0 ? sFileName.slice(0, iDot) : sFileName;
    var sExtension = iDot >= 0 ? sFileName.slice(iDot + 1)
        : (oPreview.mimeType === "image/jpeg" ? "jpg" : oPreview.mimeType.split("/")[1]);
    try {
        File.save(oPreview.blob, sName, sExtension, oPreview.mimeType);
    } catch (oError) {
        MessageToast.show(this.i18nModel.getText("Downloadnotsupported"));
    }
},

onClosePreview: function () {
    if (this._oInsurancePreviewDialog && !this._oInsurancePreviewDialog.isDestroyed()) {
        this._oInsurancePreviewDialog.close();
    }
},

_releaseInsurancePreviews: function (oAttachment) {
    if (this._oInsurancePreviewAttachment &&
        (!oAttachment || this._oInsurancePreviewAttachment === oAttachment)) {
        this._oInsurancePreviewAttachment = null;
        this._oInsurancePreviewDocument = null;
        this.onClosePreview();
    }
    if (!this._mInsurancePreviews) {
        return;
    }
    this._mInsurancePreviews.forEach(function (oPreview, oDocument) {
        if (!oAttachment || oDocument === oAttachment) {
            URL.revokeObjectURL(oPreview.url);
            this._mInsurancePreviews.delete(oDocument);
        }
    }, this);
},

onExit: function () {
    this._releaseInsurancePreviews();
    if (this._oInsuranceI18nModel) {
        this._oInsuranceI18nModel.destroy();
    }
    BaseController.prototype.onExit.call(this);
},

onTravellerNameLiveChange: function (iTravellerIndex, oEvent) {
    var oInput = oEvent.getSource();
    var bValid = utils._LCvalidateName(oEvent);
    this.getView().getModel("HealthInsuranceModel").setProperty(
        "/travellers/" + iTravellerIndex + "/fullName",
        oInput.getValue()
    );
    this._scheduleInsuranceProgressUpdate();
    return bValid;
},

_validateTravellerPassportControl: function (oInput, bFocusInvalid) {
    if (!oInput) {
        return false;
    }
    var sValue = String(oInput.getValue() || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    if (oInput.getValue() !== sValue) {
        oInput.setValue(sValue);
    }
    var bValid = this._isTravellerPassportNumberValid(sValue);
    oInput.setValueState(bValid ? "None" : "Error");
    if (!bValid && bFocusInvalid) {
        oInput.focus();
    }
    return bValid;
},

_validateTravellerDatePicker: function (oDatePicker, bFocusInvalid) {
    if (!oDatePicker) {
        return false;
    }
    var oDate = oDatePicker.getDateValue();
    var bValid = !!String(oDatePicker.getValue() || "").trim() &&
        !!oDate && !isNaN(oDate.getTime()) &&
        (!oDatePicker.isValidValue || oDatePicker.isValidValue());
    oDatePicker.setValueState(bValid ? "None" : "Error");
    if (!bValid && bFocusInvalid) {
        oDatePicker.focus();
    }
    return bValid;
},

onTravellerDateChange: function (oEvent) {
    this._validateTravellerDatePicker(oEvent.getSource(), false);
    this._scheduleInsuranceProgressUpdate();
},

onTravellerPassportLiveChange: function (iTravellerIndex, oEvent) {
    var oInput = oEvent.getSource();
    var bValid = this._validateTravellerPassportControl(oInput);
    this.getView().getModel("HealthInsuranceModel").setProperty(
        "/travellers/" + iTravellerIndex + "/passportNumber",
        oInput.getValue()
    );
    this._scheduleInsuranceProgressUpdate();
    return bValid;
},

onTravellerCountChange: function (oEvent) {
    var iCount = oEvent
        ? (parseInt(oEvent.getParameter("value"), 10) || 1)
        : 1;

    iCount = Math.max(1, Math.min(10, iCount));

    var oView = this.getView();
    var oContainer = oView.byId("travellerDetailsContainer");
    var oModel = oView.getModel("HealthInsuranceModel");

    oModel.setProperty("/totalTravellers", iCount);

    var aPassportAttachments = oModel.getProperty("/passportAttachments") || [];
    aPassportAttachments.slice(iCount).forEach(function (oAttachment) {
        if (oAttachment) {
            this._releaseInsurancePreviews(oAttachment);
        }
    }, this);
    oModel.setProperty("/passportAttachments", aPassportAttachments.slice(0, iCount));

    oContainer.destroyItems();
    var fnProgress = this._scheduleInsuranceProgressUpdate.bind(this);
    var aTravellerDatePickerIds = [];

    // Each traveller keeps their details and passport upload together in one card.
    for (var i = 1; i <= iCount; i++) {
        var aFields = [
            {
                label: "fullname",
                icon: "sap-icon://employee",
                control: new sap.m.Input(this.createId("travellerFullName" + i), {
                    value: "{HealthInsuranceModel>/travellers/" + (i - 1) + "/fullName}",
                    valueLiveUpdate: true,
                    placeholder: "{i18n>enterTravellerName}",
                    maxLength: 50,
                    valueStateText: "{i18n>MSenterValidName}",
                    liveChange: this.onTravellerNameLiveChange.bind(this, i - 1),
                    change: this.onTravellerNameLiveChange.bind(this, i - 1)
                })
            },
            {
                label: "passportNumber",
                icon: "sap-icon://badge",
                control: new sap.m.Input(this.createId("travellerPassportNumber" + i), {
                    value: "{HealthInsuranceModel>/travellers/" + (i - 1) + "/passportNumber}",
                    valueLiveUpdate: true,
                    placeholder: "{i18n>enterPassportNumber}",
                    maxLength: 9,
                    valueStateText: "{i18n>insuranceInvalidPassportNumber}",
                    liveChange: this.onTravellerPassportLiveChange.bind(this, i - 1),
                    change: this.onTravellerPassportLiveChange.bind(this, i - 1)
                })
            },
            {
                label: "dateOfBirth",
                icon: "sap-icon://calendar",
                control: new sap.m.DatePicker(this.createId("travellerDob" + i), {
                    value: "{HealthInsuranceModel>/travellers/" + (i - 1) + "/dateOfBirth}",
                    valueFormat: "yyyy-MM-dd",
                    displayFormat: "dd/MM/yyyy",
                    placeholder: "{i18n>selectDateOfBirth}",
                    minDate: "{HealthInsuranceModel>/dobMinDate}",
                    maxDate: "{HealthInsuranceModel>/dobMaxDate}",
                    valueStateText: "{i18n>selectDateOfBirth}",
                    change: this.onTravellerDateChange.bind(this)
                })
            },
            {
                label: "passportExpiryDate",
                icon: "sap-icon://calendar",
                control: new sap.m.DatePicker(this.createId("travellerPassportExpiry" + i), {
                    value: "{HealthInsuranceModel>/travellers/" + (i - 1) + "/passportExpiryDate}",
                    valueFormat: "yyyy-MM-dd",
                    displayFormat: "dd/MM/yyyy",
                    placeholder: "{i18n>selectPassportExpiryDate}",
                    minDate: "{HealthInsuranceModel>/minDate}",
                    valueStateText: "{i18n>selectPassportExpiryDate}",
                    change: this.onTravellerDateChange.bind(this)
                })
            }
        ];
        aTravellerDatePickerIds.push(
            "travellerDob" + i,
            "travellerPassportExpiry" + i
        );
        var oGrid = new sap.m.HBox({ renderType: "Bare" }).addStyleClass("svFormGrid");

        aFields.forEach(function (oField) {
            oField.control.setWidth("100%");
            oField.control.attachChange(fnProgress);
            if (oField.control.attachLiveChange) {
                oField.control.attachLiveChange(fnProgress);
            }
            oGrid.addItem(new sap.m.VBox({
                renderType: "Bare",
                items: [
                    new sap.m.Label({
                        text: "{i18n>" + oField.label + "}",
                        required: true,
                        labelFor: oField.control.getId()
                    }),
                    new sap.m.HBox({
                        renderType: "Bare",
                        items: [
                            new sap.ui.core.Icon({ src: oField.icon }).addStyleClass("svFieldIcon"),
                            oField.control
                        ]
                    }).addStyleClass("svInputShell")
                ]
            }).addStyleClass("svFld"));
        });

        var oTravellerCard = new sap.m.VBox({
            renderType: "Bare",
            width: "100%",
            items: [
                new sap.m.Title({
                    text: {
                        parts: [{ path: "i18n>travellerDetailsTitle" }, { value: i }],
                        formatter: formatMessage
                    },
                    level: "H3",
                    wrapping: true
                }).addStyleClass("insuranceTravellerTitle"),
                oGrid
            ]
        }).addStyleClass("insuranceTravellerCard");

        var oUploader = new sap.ui.unified.FileUploader(this.createId("passportUploader" + i), {
            placeholder: "{i18n>choosePassportDoc}",
            tooltip: {
                parts: [{ path: "i18n>travellerDetailsTitle" }, { value: i }],
                formatter: formatMessage
            },
            buttonOnly: true,
            buttonText: "{i18n>vrDocBrowse}",
            width: "100%",
            fileType: ["pdf", "png", "jpg", "jpeg"],
            mimeType: ["application/pdf", "image/png", "image/jpeg", "image/jpg"],
            uploadOnChange: false,
            change: this.onFileSelected.bind(this),
            typeMissmatch: this.onInsuranceFileTypeMismatch.bind(this)
        }).addStyleClass("insuranceFileUploader insuranceDocumentUploader svUploader");
        var sPassportUploadVisible = "{= !${HealthInsuranceModel>/passportAttachments/" +
            (i - 1) + "/fileName} }";
        var oPassportUploadStage = new sap.m.VBox({
            renderType: "Bare",
            width: "100%",
            customData: [
                new sap.ui.core.CustomData({
                    key: "insurance-upload-hidden",
                    value: "{= ${HealthInsuranceModel>/passportAttachments/" +
                        (i - 1) + "/fileName} ? 'true' : 'false' }",
                    writeToDom: true
                })
            ],
            items: [
                new sap.m.Label({
                    text: "{i18n>passportAttachment}",
                    required: true,
                    labelFor: oUploader.getId()
                }),
                new sap.m.VBox({
                    renderType: "Bare",
                    alignItems: "Center",
                    items: [
                        new sap.ui.core.Icon({ src: "sap-icon://upload" }).addStyleClass("insuranceUploadIcon"),
                        new sap.m.Text({
                            text: "{i18n>choosePassportDoc}",
                            textAlign: "Center"
                        }).addStyleClass("insuranceUploadTitle"),
                        new sap.m.Text(this.createId("passportUploadHint" + i), {
                            text: "{i18n>insuranceAadhaarFormats}",
                            textAlign: "Center"
                        }).addStyleClass("insuranceFileHint insuranceUploadHint"),
                        oUploader
                    ]
                }).addStyleClass("insuranceUploadBox insuranceDocumentDrop svDrop")
            ]
        }).addStyleClass("insurancePassportUploadStage");

        oTravellerCard.addItem(new sap.m.VBox({
            renderType: "Bare",
            width: "100%",
            items: [
                oPassportUploadStage,
                new sap.m.VBox(this.createId("passportUploadedFiles" + i), {
                    renderType: "Bare",
                    width: "100%"
                }).addStyleClass("insuranceFiles svFiles"),
                new sap.m.Text({
                    text: "{i18n>vrDocEmpty}",
                    textAlign: "Center",
                    visible: sPassportUploadVisible
                }).addStyleClass("svEmpty")
            ]
        }).addStyleClass("svFld insurancePassportCard"));
        oContainer.addItem(oTravellerCard);
        this._renderPassportAttachment(i);
    }

    // Initialise the model array if needed
    var aTravellers = oModel.getProperty("/travellers") || [];

    while (aTravellers.length < iCount) {
        aTravellers.push({ fullName: "", passportNumber: "", dateOfBirth: "", passportExpiryDate: "" });
    }

    aTravellers = aTravellers.slice(0, iCount);
    oModel.setProperty("/travellers", aTravellers);
    this._ViewDatePickersReadOnly(aTravellerDatePickerIds, oView);
    this._updateInsuranceProgress();
},

_navToHostelTab: function (sTabKey) {
    sessionStorage.setItem("homePageReturnTab", sTabKey);
    this.getOwnerComponent().getRouter().navTo("RouteHostel");
},

onfooterhometabselect: function () {
    this._navToHostelTab("idHome");
},

onfootertabselect: function () {
    this._navToHostelTab("idRooms");
},

onfootercontacttabselect: function () {
    this._navToHostelTab("idContact");
},

onAdminSIGNUP: function () {
    this._navToHostelTab("idVendor");
},

onUsermanualPress: function () {
    this.getOwnerComponent().getRouter().navTo("RouteUserManual", {
        flag: "hostel",
        branchId: "branchid"
    });
},

onPoliciesPress: function () {
    this.getOwnerComponent().getRouter().navTo("RoutePolicies");
},

onPolicyLinkPress: function (oEvent) {
    var sPolicyId = oEvent.getSource().data("policyId");
    if (sPolicyId) {
        this.getOwnerComponent().getRouter().navTo("RoutePoliciesTab", { policyId: sPolicyId });
    }
},

onLanguagePress: function (oEvent) {
    var sLocale = oEvent.getSource().getSelectedKey();
    if (["en", "kn", "hi"].indexOf(sLocale) === -1) {
        return;
    }
    localStorage.setItem("selectedLanguage", sLocale);
    this._applyInsuranceLanguage(sLocale);
},

onBuyHealthInsurance: function () {
    var oRouter = this.getOwnerComponent().getRouter();
    var sHash = oRouter.getURL("RouteHealthinsurance", { sPath: "Health" });
    sap.m.URLHelper.redirect(window.location.origin + window.location.pathname + "#" + sHash, true);
},

onBuyTravelInsurance: function () {
    var oRouter = this.getOwnerComponent().getRouter();
    var sHash = oRouter.getURL("RouteHealthinsurance", { sPath: "Travel" });
    sap.m.URLHelper.redirect(window.location.origin + window.location.pathname + "#" + sHash, true);
},

  onHome: function () {
            const oUser = this._oLoggedInUser;
            const oUIModel = this.getOwnerComponent().getModel("UIModel");

            if (oUser && oUser.UserID) {
                oUIModel.setProperty("/isLoggedIn", true);
            } else {
                oUIModel.setProperty("/isLoggedIn", false);
            }
            var oRouter = this.getOwnerComponent().getRouter()
            oRouter.navTo("RouteHostel")

        },

	

		
	});
});
