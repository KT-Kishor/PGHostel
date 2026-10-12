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
                "Please select DOB for Person " + i
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
    "Your health insurance information has been successfully submitted to the StayVriksha team.\nOur team will review your application and process it accordingly.",
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

    var sPlan = oPlanComboBox.getSelectedKey();
    var oMemberCount = oView.byId("memberCount");

    var iCount;

    if (sPlan === "Individual") {
        iCount = 1;
        if (oMemberCount) {
            oMemberCount.setValue(1);
        }
    } else {
        iCount = oEvent
            ? (parseInt(oEvent.getParameter("value"), 10) || 1)
            : (parseInt(oMemberCount.getValue(), 10) || 1);

        iCount = Math.max(1, Math.min(6, iCount));
    }

    oContainer.destroyItems();

    for (var i = 1; i <= iCount; i += 2) {
        var aRowItems = [];

        for (var j = i; j <= Math.min(i + 1, iCount); j++) {
            var oDatePicker = new sap.m.DatePicker(
                this.createId("memberDob" + j),
                {
                    placeholder: "Select date of birth",
                    displayFormat: "dd/MM/yyyy",
                    valueFormat: "yyyy-MM-dd",
                    width: "100%"
                }
            );

            aRowItems.push(
                new sap.m.VBox({
                    width: "49%",
                    items: [
                        new sap.m.Label({
                            text: "Person " + j + " - DOB",
                            required: true
                        }),
                        oDatePicker
                    ]
                }).addStyleClass("memberDobItem")
            );
        }

        oContainer.addItem(
            new sap.m.HBox({
                width: "100%",
                justifyContent: "SpaceBetween",
                alignItems: "Start",
                items: aRowItems
            }).addStyleClass("sapUiSmallMarginBottom")
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
    if (aTravellersData.length < iTotalTravellers) {
        sap.m.MessageBox.warning(
            "Please enter details for all " +
            iTotalTravellers + " travellers.",
            {
                title: "Missing Traveller Details"
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
                "Please fill the following fields for Traveller " +
                iTravellerNo + ":\n\n• " +
                aMissingFields.join("\n• "),
                {
                    title: "Missing Traveller Details"
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
    "Your travel insurance information has been successfully " +
    "submitted to the StayVriksha team.\n\n" +
    "Our team will review your application and process it accordingly.",
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
onCancelPress:function(){
    sap.m.MessageBox.information(
    "Are you sure want to exit the page",
    {
        title: "Cancellation",
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

        sap.m.MessageToast.show(
            "Passport attached for Traveller " +
            (iTravellerIndex + 1)
        );
    };

    oReader.onerror = function () {
        sap.m.MessageToast.show("Unable to read the passport file.");
    };

    oReader.readAsDataURL(oFile);
},



onTravellerCountChange: function (oEvent) {
  var iCount = oEvent
    ? (parseInt(oEvent.getParameter("value"), 10) || 1)
    : 1;
    iCount = Math.max(1, Math.min(10, iCount));

    var oView = this.getView();
    var oPage = oView.byId("insuranceObjectPage");
    var oModel = oView.getModel("HealthInsuranceModel");

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
             columnsXL:2,
                                columnsL:2,
                                columnsM:1,
                                labelSpanXL:3,
                                labelSpanL:3,
                                labelSpanM:4,
                                labelSpanS:12,
            content: [
                new sap.m.Label({ text: "Full Name", required: true }),
                new sap.m.Input({
                    value: "{HealthInsuranceModel>/travellers/" +
                        (i - 1) + "/fullName}",
                    placeholder: "Enter traveller name",
                    maxLength:50
                    
                }),
                   new sap.m.Label({ text: "Passport Number", required: true }),
                new sap.m.Input({
                    value: "{HealthInsuranceModel>/travellers/" +
                        (i - 1) + "/passportNumber}",
                    placeholder: "Enter passport number",
                    maxLength: 8
                }),

                new sap.m.Label({ text: "Date of Birth", required: true }),
                new sap.m.DatePicker({
                    value: "{HealthInsuranceModel>/travellers/" +
                        (i - 1) + "/dateOfBirth}",
                    valueFormat: "yyyy-MM-dd",
                    displayFormat: "dd/MM/yyyy",
                    placeholder: "Select date of birth"
                }),
                   new sap.m.Label({ text: "Passport Expiry Date", required: true }),
                new sap.m.DatePicker({
                    value: "{HealthInsuranceModel>/travellers/" +
                        (i - 1) + "/passportExpiryDate}",
                    valueFormat: "yyyy-MM-dd",
                    displayFormat: "dd/MM/yyyy",
                    placeholder: "Select passport expiry date"
                }),
                new sap.m.Label({
    text: "Passport Attachment",
    required: true
}),
new sap.ui.unified.FileUploader({
    id: "passportUploader" + i,
    width: "100%",
    placeholder: "Choose passport document/image",
    uploadOnChange: false,
    change: this.onFileSelected.bind(this)
})
            ]
        });

        var oSubSection = new sap.uxap.ObjectPageSubSection({
            title: "Traveller " + i + " Details",
            blocks: [oForm]
        });

        var oSection = new sap.uxap.ObjectPageSection({
            title: "Traveller " + i,
            subSections: [oSubSection]
        });

        oSection.data("travellerSection", true);
        oPage.addSection(oSection);
    }

    // Initialise the model array if needed
    var aTravellers = oModel.getProperty("/travellers") || [];

    while (aTravellers.length < iCount) {
        aTravellers.push({ fullName: "", dateOfBirth: "" });
    }

    aTravellers = aTravellers.slice(0, iCount);
    oModel.setProperty("/travellers", aTravellers);
}
	

		
	});
});