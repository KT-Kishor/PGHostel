sap.ui.define([
	  "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
], function(
	BaseController,
	JSONModel,
	utils,
	MessageToast
) {
	"use strict";

	return BaseController.extend("sap.ui.com.project1.controller.Healthinsurance", {
		   onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteHealthinsurance").attachMatched(this._onRouteMatched, this);
        },
		_onRouteMatched: function (oEvent) {
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

const sLocale = localStorage.getItem("selectedLanguage") || "en";

sap.ui.getCore().getConfiguration().setLanguage(sLocale);

// Refresh the i18n resource bundle
this.getView().getModel("i18n").refresh(true);

this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

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
});
            this.getView().setModel(oModel,"HealthInsuranceModel");
			    var oStepInput = this.byId("memberCount");

    this.onMemberCountChange({
        getParameter: function (sName) {
            return sName === "value" ? oStepInput.getValue() : null;
        }
    });
            if(sPath === "Health") {

            }else{
            this.onTravellerCountChange()
            }
            this._ViewDatePickersReadOnly(["id_startDate", "id_endDate"], this.getView());

		},
		

onhealthSubmitPress: async function () {
    var oView = this.getView();

	   if (
                    !utils._LCvalidateMandatoryField(oView.byId("Id_fullName"), "ID") ||
                    !utils._LCvalidateEmail(oView.byId("Id_email"), "ID") ||
                    !utils._LCvalidateMandatoryField(oView.byId("ID_mobileNumber"), "ID") ||
                    !utils._LCstrictValidationComboBox(oView.byId("insurancePlan"), "ID") ||
                    !utils._LCvalidateMandatoryField(oView.byId("ID_diseases"), "ID") ||
                    !utils._LCvalidateMandatoryField(oView.byId("ID_Weight"), "ID") ||
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
          this.getBusyDialog()
       await this.ajaxCreateWithJQuery("HM_Health", {
                        data: oData
                    });
			this.closeBusyDialog();
		
    sap.m.MessageBox.information(
    this.i18nModel.getText("healthInsuranceSubmitSuccess"),
    {
        title: "Application Submitted",
        onClose: function (sAction) {
            if (sAction === sap.m.MessageBox.Action.OK) {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("RouteHostel");
            }
        }.bind(this)
    }
)

},
onInputChange:function (oEvent) {
    utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
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
},
        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },
		onInputMobileChange: function (oEvent) {
            utils.onNumber(oEvent);
		},
        onBloodGroupChange:function (oEvent){
          utils._LCstrictValidationComboBox(oEvent);
        },
		onInsurancePlanChange: function (oEvent) {
    utils._LCstrictValidationComboBox(oEvent);

    var oView = this.getView();
    var oPlanComboBox = oView.byId("insurancePlan");
    var oMemberCount = oView.byId("memberCount");

    if (oPlanComboBox.getSelectedKey() === "Individual") {
        oMemberCount.setValue(1);
        this.onMemberCountChange();
        oView.byId("memberCount").setEditable(false)
    } else {
        this.onMemberCountChange();
        oView.byId("memberCount").setEditable(true)

    }
},
	
		onHealthCancelPress: function () {
    var oView = this.getView();
    var oModel = oView.getModel("HealthInsuranceModel");

    // Reset the model
    oModel.setData({
        sPath: "Health"
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
    var oPlanComboBox = oView.byId("insurancePlan");
    var oMemberCount = oView.byId("memberCount");

    var oBundle = oView.getModel("i18n").getResourceBundle();
    var sPlan = oPlanComboBox.getSelectedKey();
    var iCount;

    if (sPlan === "Individual") {
        iCount = 1;
    } else {
        iCount = oEvent
            ? (parseInt(oEvent.getParameter("value"), 10) || 1)
            : (parseInt(oMemberCount.getValue(), 10) || 1);

        iCount = Math.max(1, Math.min(6, iCount));
    }

    if (oMemberCount) {
        oMemberCount.setValue(iCount);
    }

    oContainer.destroyItems();

    for (var i = 1; i <= iCount; i += 2) {
        var aRowItems = [];

        for (var j = i; j <= Math.min(i + 1, iCount); j++) {
            var oLabel = new sap.m.Label({
                text: oBundle.getText("PersonDOB", [j]),
                required: true,
                wrapping: false,
                width: "7.9rem",
                layoutData: new sap.m.FlexItemData({
                    shrinkFactor: 0
                })
            });

            var oDatePicker = new sap.m.DatePicker(
                this.createId("memberDob" + j),
                {
                    placeholder: oBundle.getText("SelectDOB"),
                    displayFormat: "dd/MM/yyyy",
                    valueFormat: "yyyy-MM-dd",
                    width: "100%",
                    layoutData: new sap.m.FlexItemData({
                        growFactor: 1,
                        shrinkFactor: 1
                    })
                }
            );

            aRowItems.push(
                new sap.m.HBox({
                    width: "49%",
                    alignItems: "Center",
                    items: [oLabel, oDatePicker]
                }).addStyleClass("memberDobItem")
            );
        }

        oContainer.addItem(
            new sap.m.FlexBox({
                width: "80%",
                wrap: "Wrap",
                justifyContent: "SpaceBetween",
                alignItems: "Center",
                items: aRowItems
            }).addStyleClass("sapUiSmallMarginBottom sapUiMediumMarginBegin")
        );
    }
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
        !utils._LCstrictValidationComboBox(
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

    // 3. Check that all traveller records exist
// 3. Check that all traveller records exist
if (aTravellersData.length < iTotalTravellers) {
    sap.m.MessageBox.warning(
        this.i18nModel.getText(
            "missingTravellerDetails",
            [iTotalTravellers]
        ),
        {
            title: this.i18nModel.getText(
                "missingTravellerDetailsTitle"
            )
        }
    );
    return;
}

    // 4. Validate each traveller
    for (var i = 0; i < iTotalTravellers; i++) {
        var oTraveller = aTravellersData[i] || {};
        var iTravellerNo = i + 1;
        var aMissingFields = [];

        // Full Name
        if (
            !oTraveller.fullName ||
            !oTraveller.fullName.trim()
        ) {
            aMissingFields.push("Full Name");
        }

        // Passport Number
        if (
            !oTraveller.passportNumber ||
            !oTraveller.passportNumber.trim()
        ) {
            aMissingFields.push("Passport Number");
        }

        // Date of Birth
        if (!oTraveller.dateOfBirth) {
            aMissingFields.push("Date of Birth");
        }

        // Passport Expiry Date
        if (!oTraveller.passportExpiryDate) {
            aMissingFields.push("Passport Expiry Date");
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
    aMissingFields.push("Passport Attachment");
}

        // Show all missing fields for this traveller
    if (aMissingFields.length > 0) {
    sap.m.MessageBox.warning(
        this.i18nModel.getText("missingTravellerFieldsMessage", [
            iTravellerNo,
            aMissingFields.join("\n• ")
        ]),
        {
            title: this.i18nModel.getText(
                "missingTravellerFieldsTitle"
            )
        }
    );
    return;
}
    }

    // 5. Prepare complete payload
    var oCompletePayload = {
        type: oHealthData.insurancePlan,
        destination: oView.byId("id_Destination").getSelectedKey(),
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

    sap.m.MessageBox.information(
 
       this.i18nModel.getText("travelInsuranceSubmitSuccess"),
    {
        title: this.i18nModel.getText("applicationSubmittedTitle"),
        onClose: function (sAction) {
            if (sAction === sap.m.MessageBox.Action.OK) {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("RouteHostel");
            }
        }.bind(this)
    }
);

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
    sap.m.MessageBox.information(
        this.i18nModel.getText("Areyousurewanttoexitthepage"),
        {
            title: this.i18nModel.getText("confirmCancellation"),
            actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
            emphasizedAction: sap.m.MessageBox.Action.OK,

            onClose: function (sAction) {
                if (sAction === sap.m.MessageBox.Action.OK) {
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo("RouteHostel");
                }
            }.bind(this),

            styleClass: "myUnifiedBtn  "
        }
    );
},


onFileSelected: function (oEvent) {
    var oUploader = oEvent.getSource();
    var oFile = oEvent.getParameter("files")[0];

    if (!oFile) {
        return;
    }

    var oModel = this.getView().getModel("HealthInsuranceModel");

    var sUploaderId = oUploader.getId();
    var iTravellerIndex = parseInt(
        sUploaderId.split("passportUploader")[1],
        10
    ) - 1;

    var aAttachments =
        oModel.getProperty("/passportAttachments") || [];

    var oReader = new FileReader();

    oReader.onload = function (oReaderEvent) {
        var sBase64Content = oReaderEvent.target.result.split(",")[1];

        aAttachments[iTravellerIndex] = {
            travellerNumber: iTravellerIndex + 1,
            fileName: oFile.name,
            fileType: oFile.type,
            fileSize: oFile.size,
            fileContent: sBase64Content
        };

        oModel.setProperty("/passportAttachments", aAttachments);

    
    };

    oReader.onerror = function () {
        sap.m.MessageToast.show("Unable to read the passport file.");
    };

    oReader.readAsDataURL(oFile);
},


onAadhaarAttachmentChange: function (oEvent) {
    var oView = this.getView();
    var oModel = oView.getModel("HealthInsuranceModel");
    var aFiles = Array.from(oEvent.getParameter("files") || []);
    var aAttachments = oModel.getProperty("/aadhaarAttachments") || [];
    var oFileList = oView.byId("aadhaarUploadedFiles");
    var that = this;

    if (!aFiles.length) {
        return;
    }

    aFiles.forEach(function (oFile) {
        // Avoid adding the same file twice
        var bExists = aAttachments.some(function (oItem) {
            return oItem.fileName === oFile.name &&
                oItem.fileSize === oFile.size;
        });

        if (bExists) {
            return;
        }

        if (oFile.size > 5 * 1024 * 1024) {
            sap.m.MessageBox.error(
                oFile.name + " exceeds the 5 MB limit."
            );
            return;
        }

        var oReader = new FileReader();

        oReader.onload = function (oLoadEvent) {
            var sBase64 = oLoadEvent.target.result.split(",")[1];

            var oAttachment = {
                id: Date.now() + "_" + Math.random().toString(36).slice(2),
                fileName: oFile.name,
                mimeType: oFile.type,
                fileSize: oFile.size,
                content: sBase64
            };

            aAttachments.push(oAttachment);
            oModel.setProperty("/aadhaarAttachments", aAttachments);

            // Create a row for this file
            var oRow = new sap.m.HBox({
                width: "100%",
                alignItems: "Center",
                gap:"6px",
                items: [
                    new sap.m.HBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({
                                src: "sap-icon://attachment"
                            }).addStyleClass("sapUiTinyMarginEnd"),

                            new sap.m.Text({
                                text: oFile.name,
                                wrapping: true
                            })
                        ]
                    }),
                    new sap.m.Button({
                        text: "{i18n>Remove}",
                        icon: "sap-icon://delete",
                        type: "Reject",
                        press: function () {
                            that.onRemoveAadhaarAttachment(
                                oAttachment.id
                            );
                        }
                    })
                ]
            }).addStyleClass("sapUiTinyMarginBottom");

            oRow.data("attachmentId", oAttachment.id);
            oFileList.addItem(oRow);
        };

        oReader.onerror = function () {
            sap.m.MessageBox.error(
                "Unable to read " + oFile.name
            );
        };

        oReader.readAsDataURL(oFile);
    });

    // Clear the native selection so the user can select more files later
    oView.byId("aadhaarUploader").clear();
},

onRemoveAadhaarAttachment: function (sAttachmentId) {
    var oView = this.getView();
    var oModel = oView.getModel("HealthInsuranceModel");
    var aAttachments = oModel.getProperty("/aadhaarAttachments") || [];
    var oFileList = oView.byId("aadhaarUploadedFiles");

    aAttachments = aAttachments.filter(function (oItem) {
        return oItem.id !== sAttachmentId;
    });

    oModel.setProperty("/aadhaarAttachments", aAttachments);

    // Remove only the selected file's row
    oFileList.getItems().slice().forEach(function (oRow) {
        if (oRow.data("attachmentId") === sAttachmentId) {
            oFileList.removeItem(oRow);
            oRow.destroy();
        }
    });
},
onTravellerCountChange: function (oEvent) {
    var iCount = oEvent
        ? (parseInt(oEvent.getParameter("value"), 10) || 1)
        : 1;

    iCount = Math.max(1, Math.min(10, iCount));

    var oView = this.getView();
    var oPage = oView.byId("insuranceObjectPage");
    var oModel = oView.getModel("HealthInsuranceModel");
    
    // Get i18n resource bundle
    var oBundle = oView.getModel("i18n").getResourceBundle();

    oModel.setProperty("/totalTravellers", iCount);

    // Remove previously generated traveller sections
    oPage.getSections()
        .filter(function (oSection) {
            return oSection.data("travellerSection") === true;
        })
        .forEach(function (oSection) {
            oPage.removeSection(oSection);
            oSection.destroy();
        });

    // Create one section for each traveller
    for (var i = 1; i <= iCount; i++) {
        var oForm = new sap.ui.layout.form.SimpleForm({
            editable: true,
            layout: "ColumnLayout",
            columnsXL: 2,
            columnsL: 2,
            columnsM: 1,
            labelSpanXL: 3,
            labelSpanL: 3,
            labelSpanM: 4,
            labelSpanS: 12,
            content: [
                new sap.m.Label({ 
                    text: oBundle.getText("fullname"), 
                    required: true 
                }),
                new sap.m.Input({
                    value: "{HealthInsuranceModel>/travellers/" + (i - 1) + "/fullName}",
                    placeholder: oBundle.getText("enterTravellerName"),
                    maxLength: 50
                }),
                new sap.m.Label({ 
                    text: oBundle.getText("passportNumber"), 
                    required: true 
                }),
                new sap.m.Input({
                    value: "{HealthInsuranceModel>/travellers/" + (i - 1) + "/passportNumber}",
                    placeholder: oBundle.getText("enterPassportNumber"),
                    maxLength: 8
                }),
                new sap.m.Label({ 
                    text: oBundle.getText("dateOfBirth"), 
                    required: true 
                }),
                new sap.m.DatePicker({
                    value: "{HealthInsuranceModel>/travellers/" + (i - 1) + "/dateOfBirth}",
                    valueFormat: "yyyy-MM-dd",
                    displayFormat: "dd/MM/yyyy",
                    placeholder: oBundle.getText("selectDateOfBirth")
                }),
                new sap.m.Label({ 
                    text: oBundle.getText("passportExpiryDate"), 
                    required: true 
                }),
                new sap.m.DatePicker({
                    value: "{HealthInsuranceModel>/travellers/" + (i - 1) + "/passportExpiryDate}",
                    valueFormat: "yyyy-MM-dd",
                    displayFormat: "dd/MM/yyyy",
                    placeholder: oBundle.getText("selectPassportExpiryDate")
                }),
                new sap.m.Label({
                    text: oBundle.getText("passportAttachment"),
                    required: true
                }),
                new sap.ui.unified.FileUploader({
                    id: "passportUploader" + i,
                    width: "100%",
                    placeholder: oBundle.getText("choosePassportDoc"),
                    uploadOnChange: false,
                    change: this.onFileSelected.bind(this)
                })
            ]
        });

        var oSubSection = new sap.uxap.ObjectPageSubSection({
            title: oBundle.getText("travellerDetailsTitle", [i]),
            blocks: [oForm]
        });

        var oSection = new sap.uxap.ObjectPageSection({
            title: oBundle.getText("travellerTitle", [i]),
            subSections: [oSubSection]
        });

        oSection.data("travellerSection", true);
        oPage.addSection(oSection);
    }

    // Initialise the model array if needed
    var aTravellers = oModel.getProperty("/travellers") || [];

    while (aTravellers.length < iCount) {
        aTravellers.push({ fullName: "", passportNumber: "", dateOfBirth: "", passportExpiryDate: "" });
    }

    aTravellers = aTravellers.slice(0, iCount);
    oModel.setProperty("/travellers", aTravellers);
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