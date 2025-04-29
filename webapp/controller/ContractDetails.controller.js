sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ContractDetails", {
            onInit: function () {
                this.getRouter().getRoute("RouteContractDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                this.getBusyDialog(); // Show busy dialog
                this.commonLoginFunction("Contract");
                await this._fetchCommonData("Currency", "CurrencyModel");
                await this._fetchCommonData("BaseLocation", "BaseLocationModel");
                await this._fetchCommonData("ManageCustomer", "CreateCustomerModel");
                await this._fetchCommonData("PaymentTerms", "ContractpaymentModel");
            
                this.sArgPara = oEvent.getParameter("arguments").sParContract;
                var AgreementNo = oEvent.getParameter("arguments").sID
                var oView = this.getView();
                this.i18nModel = oView.getModel("i18n").getResourceBundle();
            
                var oWizard = oView.byId("CD_id_Wizard");
                oWizard.discardProgress(oView.byId("CD_id_Firststep"));
                oWizard.goToStep(oView.byId("CD_id_Firststep"));
            
                this._wizard = oView.byId("wizardContentPage");
                oWizard.getSteps()[0].setValidated(false);
                oWizard.getSteps()[1].setValidated(false);
            
                if (this.sArgPara === "CreateContractFlag") {
                    try {
                        const response = await this.ajaxReadWithJQuery("Contract", {});
                        const rawData = response.data || {};
                        const oModelContractNo = Array.isArray(rawData) ? rawData : Object.values(rawData);
            
                        let newContractNo;
                        if (oModelContractNo.length > 0) {
                            const contractNos = oModelContractNo.map(obj => parseInt(obj.ContractNo.slice(4), 10));
                            const maxContractNo = Math.max(...contractNos);
                            newContractNo = "KT-C" + (maxContractNo + 1).toString().padStart(3, '0');
                        } else {
                            newContractNo = "KT-C001";
                        }
            
                        oView.byId('CD_id_ConNo').setValue(newContractNo);
            
                        const oData = {
                            ContractNo: newContractNo,
                            AgreementDate: this.Formatter.formatDate(new Date()),
                            ConsultantName: "",
                            ConsultantAddress: "",
                            ContarctEmail: "",
                            Role: "",
                            Rate: "Hr",
                            Amount: "",
                            Currency: "INR",
                            EndClientHirer: "",
                            Location: "REMOTE",
                            HiringContact: "",
                            AssignmentStatus: "New",
                            StartDate: "",
                            EndDate: "",
                            InsuranceRequirement: "No",
                            WarrantyDate: "3 Months",
                            AdditionalRates: "No",
                            PaymentTerms: "45 Days",
                            Status: "Submitted",
                            Salutation: "Mr.",
                            Salutation2: "Mr.",
                            contractLocation: "Kalaburagi"
                        };
            
                        const oModel = new sap.ui.model.json.JSONModel(oData);
                        oView.setModel(oModel, "ContractModelWizart");
            
                        oView.byId("C_id_PageCreate").setVisible(true);
                        oView.byId("CUF_id_pageTrainee").setVisible(false);
            
                        this.closeBusyDialog(); //  Close BusyDialog
                    } catch (error) {
                        this.closeBusyDialog(); //  Close BusyDialog
                        sap.m.MessageToast.show(error.message || error.responseText);
                    }
            
                } else {
                    // UPDATE case
                    this.getView().getModel("LoginModel").setProperty("/sendEmail", false);
                
                    var ContractStatusModel = new sap.ui.model.json.JSONModel({ status: false });
                    this.getView().setModel(ContractStatusModel, "ContractStatus");
                
                    var editable = new sap.ui.model.json.JSONModel({ editable: false, Status: false });
                    this.getView().setModel(editable, "simpleForm");
                
                    var oViewModel = new sap.ui.model.json.JSONModel({ isEditMode: false, isVisiable: true, isMerge: true });
                    this.getView().setModel(oViewModel, "viewModel");
                
                    try {
                        var response = await this.ajaxReadWithJQuery("Contract", {ContractNo: this.sArgPara, AgreementNo: AgreementNo});
                
                        var oResult = response.data[0];
                        this.ContractNo = oResult.ContractNo;
                        this.OldStatus = oResult.ContractStatus;
                        this.AssignmentStartDate = oResult.AssignmentStartDate;
                        this.AssignmentEndDate = oResult.AssignmentEndDate;
                        this.ContractStatus = oResult.ContractStatus;
                
                        if (this.ContractStatus !== "Inactive") {
                            this.getView().getModel("ContractStatus").setProperty("/status", true);
                        }
                
                        var contractModel = new sap.ui.model.json.JSONModel(oResult);
                        this.getOwnerComponent().setModel(contractModel, "oFilteredContractModel");
                
                        this.getView().getModel("oFilteredContractModel").setProperty("/Amount", parseFloat(oResult.ConsultantRate.split(" ")[0]));
                        this.getView().getModel("oFilteredContractModel").setProperty("/Currency", oResult.ConsultantRate.split(" ")[1]);
                
                        var rateType = oResult.ConsultantRate.split(" ")[3];
                        var varible = rateType === "Hr" ? 0 : rateType === "Day" ? 1 : 2;
                        this.getView().getModel("oFilteredContractModel").setProperty("/HrDaliyMonth", varible);
                
                        this.getView().byId("C_id_PageCreate").setVisible(false);
                        this.getView().byId("CUF_id_pageTrainee").setVisible(true);
                
                        this.closeBusyDialog(); // Close BusyDialog
                    } catch (error) {
                        this.closeBusyDialog(); // Close BusyDialog
                        sap.m.MessageToast.show(error.message || error.responseText);
                    }
                }
            },
                
            CD_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.validateStep();

                const selectedKey = oEvent.getSource().getSelectedKey();
                const oModel = this.getView().getModel("ContractModelWizart");
                oModel.setProperty("/HiringContact", selectedKey);
            },
            CD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.validateStep();
            },
            CD_validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.validateStep();
            },
            CD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.validateStep();
            },
            CD_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
                this.validateStep();
            },
            //back function
            CD_onPressback: function () {
                this.showConfirmationDialog(
                    this.i18nModel.getText("ConfirmActionTitle"),
                    this.i18nModel.getText("backConfirmation"),
                    function () {
                        this.getRouter().navTo("RouteContract");
                    }.bind(this)
                );
                this.byId("CD_id_Secstep").getParent().setShowNextButton(true);
            },
            CU_onBack: function () {
                var isEditMode = this.getView().getModel("viewModel").getProperty("/isEditMode");
                if (isEditMode) {
                    // Save button is visible, ask for confirmation
                    this.showConfirmationDialog(
                        this.i18nModel.getText("ConfirmActionTitle"),
                        this.i18nModel.getText("backConfirmation"),
                        function () {
                            // On confirm, reset and navigate back
                            this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                            this.getView().getModel("simpleForm").setProperty("/editable", false);
                            this.getRouter().navTo("RouteContract");
                        }.bind(this)
                    );
                } else {
                    // Edit button is visible, allow direct back
                    this.getRouter().navTo("RouteContract");
                }
            },
            //Step validation
            validateStep: function () {
                var step1Validated = this.byId("CD_id_AgreeDate").getValue() && this.byId("CD_id_CName").getValue() &&
                    this.byId("CD_id_Address").getValue() && this.byId("CD_id_Email").getValue() &&
                    this.byId("CD_id_Role").getValue() && this.byId("CD_id_Amount").getValue() &&
                    utils._LCvalidateDate(this.byId("CD_id_AgreeDate"), "ID") && utils._LCvalidateName(this.byId("CD_id_CName"), "ID") &&
                    utils._LCvalidateEmail(this.byId("CD_id_Email"), "ID") && utils._LCvalidateMandatoryField(this.byId("CD_id_Address"), "ID") &&
                    utils._LCvalidateAmount(this.byId("CD_id_Amount"), "ID");

                var step2Validated = this.byId("CD_id_HiringContact").getValue() && this.byId("CD_id_Datestart").getValue() && this.byId("CD_id_DateEnd").getValue() &&
                    utils._LCvalidateName(this.byId("CD_id_HiringContact"), "ID") && utils._LCvalidateDate(this.byId("CD_id_Datestart"), "ID") && utils._LCvalidateDate(this.byId("CD_id_DateEnd"), "ID");

                var isStep1Validated = step1Validated ? true : false;
                var isStep2Validated = step2Validated ? true : false;

                // Update validation status for each step
                this.byId("CD_id_Wizard").getSteps()[0].setValidated(isStep1Validated);
                this.byId("CD_id_Wizard").getSteps()[1].setValidated(isStep2Validated);
            },

             //radio button select function
             RadioButtonSelect: function (oEvent) {
                var oModel = this.getView().getModel("ContractModelWizart");
                this.RadioButton = oEvent.getSource().getAggregation("buttons")[oEvent.getSource().mProperties.selectedIndex].getText()
                oModel.setProperty("/Rate", this.RadioButton);
            },

            CD_onSubmit: async function () {
                try {
                    var allStepsValidated = this.byId("CD_id_Wizard").getSteps().every(function (step) {
                        return step.getValidated();
                    });
            
                    if (!allStepsValidated) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }

                    var formattedText;
                    switch (this.RadioButton) {
                        case "Hour":
                            formattedText = "Hr";
                            break;
                        case "Daily":
                            formattedText = "Day";
                            break;
                        case "Monthly":
                            formattedText = "Month";
                            break;
                        default:
                            formattedText = "Hr";
                    }

                    var oModel = this.getView().getModel("ContractModelWizart");
                    // Prepare data object with the required fields
                    var data = {
                        "ContractNo": oModel.oData.ContractNo,
                        "ConsultantNameSalutation": (oModel.oData.Salutation),
                        "ConsultantName": (oModel.oData.ConsultantName),
                        "ConsultantAddress": (oModel.oData.ConsultantAddress),
                        "EndClient": (oModel.oData.EndClientHirer),
                        "ConsultingService": (oModel.oData.Role),
                        "LocationService": (oModel.oData.Location),
                        "ContractStatus": (oModel.oData.AssignmentStatus),
                        "AssignmentStartDate": oModel.oData.StartDate.split("/").reverse().join("-"),
                        "AssignmentEndDate": oModel.oData.EndDate.split("/").reverse().join("-"),
                        "ConsultantRate": oModel.oData.Amount + " " + oModel.oData.Currency + " Per " + formattedText + " Including all tax",
                        "PaymentTerms": (oModel.oData.PaymentTerms),
                        "ClientReportContactSalutation": (oModel.oData.Salutation2),
                        "ClientReportContact": (oModel.oData.HiringContact),
                        "SpecificInsuranceRequirement": (oModel.oData.InsuranceRequirement),
                        "ContractPeriod": (oModel.oData.WarrantyDate),
                        "ExpensesClaim": (oModel.oData.AdditionalRates),
                        "Status": "Submitted",
                        "AgreementDate":oModel.oData.AgreementDate.split("/").reverse().join("-"),
                        "ContarctEmail": (oModel.oData.ContarctEmail),
                        "ContractLocation": (oModel.oData.contractLocation),
                        "AgreementNo": String(1).padStart(2, '0')
                    };
                    this.getBusyDialog(); // Show busy dialog
                    var response = await this.ajaxCreateWithJQuery("Contract", { data: data });
                    if(response.success===true){
                        this.closeBusyDialog(); // Close busy dialog
                        MessageToast.show(this.i18nModel.getText("contractSuccess"));
                        this.getRouter().navTo("RouteContract")
                    }
                } catch (error) {
                    this.closeBusyDialog(); // Close busy dialog
                    MessageToast.show(error.message || error.responseText);
                }
            }, 

            onEditOrSavePress: function () {
                var oViewModel = this.getView().getModel("viewModel");
                var isEditMode = oViewModel.getProperty("/isEditMode");
                if (isEditMode) {
                this.onPressSave();
                } else {
                if (this.ContractStatus !== 'Active') {
                    this.getView().getModel("simpleForm").setProperty("/editable", true);
                    this.getView().getModel("simpleForm").setProperty("/Status", true);
                    oViewModel.setProperty("/isEditMode", true);
                    this.byId("CU_id_Merge").setEnabled(false)
                    this.byId("CU_id_Mail").setEnabled(false)
                } else {
                    this.getView().getModel("simpleForm").setProperty("/Status", true);
                    oViewModel.setProperty("/isEditMode", true);
                    this.byId("CU_id_Merge").setEnabled(false)
                    this.byId("CU_id_Mail").setEnabled(false)
                }
                }
            },

            onChangeStartEndDate: function (oEvent) {
                var oModel = this.getView().getModel("oFilteredContractModel")
                var oModelData = oModel.getData();
                var endDate = this.AssignmentEndDate.split('/').map(Number);
                var endDateCreate = new Date(endDate[2], endDate[1] - 1, endDate[0]);
                var today = new Date();
                if (today >= endDateCreate) {
                  if (oEvent.getSource().getValue() === "Renewed" && this.OldStatus === "Active") {
                    var assignmentStart = oModelData.AssignmentEndDate;
                    var assignmentStart = new Date(assignmentStart.split('/')[2], assignmentStart.split('/')[1] - 1, assignmentStart.split('/')[0], 10);
                    assignmentStart.setDate(assignmentStart.getDate() + 1);
                    oModel.setProperty("/AssignmentStartDate", this.Formatter.formatDate(assignmentStart));
          
                    var assignmentEndDate = assignmentStart;
                    var contractPeriod = parseInt(oModelData.ContractPeriod.split(" ")[0]);
                    assignmentEndDate.setMonth(assignmentEndDate.getMonth() + contractPeriod);
                    var incrementedDate = assignmentEndDate.toISOString().split('T')[0];
                    oModel.setProperty("/AssignmentEndDate", this.Formatter.formatDate(incrementedDate))
                  } else {
                    oModel.setProperty("/AssignmentStartDate", this.AssignmentStartDate);
                    oModel.setProperty("/AssignmentEndDate", this.AssignmentEndDate)
                  }
                }
              },

              onPressSave: async function () {
                var that = this;
                var isMandatoryValid = (
                    utils._LCvalidateName(this.byId("CU_id_ConsultantName"), "ID") &&
                    utils._LCvalidateMandatoryField(this.byId("CU_id_ConsultingService"), "ID") &&
                    utils._LCvalidateEmail(this.byId("CU_id_ContractEmailID"), "ID") &&
                    utils._LCvalidateMandatoryField(this.byId("CU_id_ContractAddress"), "ID") &&
                    utils._LCvalidateName(this.byId("CU_id_ClientReportContact"), "ID") &&
                    utils._LCvalidateAmount(this.byId("CU_id_EditAmountInput"), "ID") 
                  );
                  if (!isMandatoryValid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                  }
                var oModel = this.getView().getModel("oFilteredContractModel").getData();
                var AgreementNo = oModel.AgreementNo;
                var newAgreementNo = (oModel.ContractStatus === 'Renewed') ? (parseInt(AgreementNo) + 1) : AgreementNo;
                newAgreementNo = String(newAgreementNo).padStart(2, "0");
            
                var type = oModel.HrDaliyMonth;
                var radioValue = type === 0 ? "Hr" : type === 1 ? "Day" : "Month";
                var ConsultantRate = `${oModel.Amount} ${oModel.Currency} Per ${radioValue} Including all tax`;
            
                var jsonData = {
                    "ContractNo": oModel.ContractNo,
                    "AgreementNo": newAgreementNo,
                    "ConsultantNameSalutation": (oModel.ConsultantNameSalutation),
                    "ConsultantName": (oModel.ConsultantName),
                    "ConsultingService": (oModel.ConsultingService),
                    "ConsultantAddress": (oModel.ConsultantAddress),
                    "EndClient": (oModel.EndClient),
                    "LocationService": (oModel.LocationService),
                    "ContractStatus": (oModel.ContractStatus === 'Renewed') ? 'New' : oModel.ContractStatus,
                    "AssignmentStartDate": oModel.AssignmentStartDate,
                    "AssignmentEndDate": oModel.AssignmentEndDate,
                    "ConsultantRate": (ConsultantRate),
                    "PaymentTerms": (oModel.PaymentTerms),
                    "ClientReportContactSalutation": (oModel.ClientReportContactSalutation),
                    "ClientReportContact": (oModel.ClientReportContact),
                    "SpecificInsuranceRequirement": (oModel.SpecificInsuranceRequirement),
                    "ContractPeriod": (oModel.ContractPeriod),
                    "ExpensesClaim": (oModel.ExpensesClaim),
                    "AgreementDate": (oModel.AgreementDate),
                    "ContarctEmail": (oModel.ContarctEmail),
                    "ContractLocation": (oModel.ContractLocation),
                    "Comments": oModel.Comments
                };
            
                var oldContractData = { "ContractStatus": "Inactive" };
                this.getBusyDialog(); // Show busy dialog
            
                // Handle Renewed case
                if (oModel.ContractStatus === "Renewed" && that.OldStatus !== "Active") {
                    this.getView().getModel("simpleForm").setProperty("/editable", false);
                    this.getView().getModel("simpleForm").setProperty("/Status", false);
                    this.byId("CU_id_Merge").setEnabled(true);
                    this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                    this.byId("CU_id_Mail").setEnabled(true);
                    this.closeBusyDialog(); //  Close BusyDialog
                    return sap.m.MessageBox.error(this.i18nModel.getText("contractStatusMessage"));
                }
            
                if (oModel.ContractStatus === "Renewed" && that.OldStatus === "Active") {
                    var endDate = this.AssignmentEndDate.split('/').map(Number);
                    var endDateCreate = new Date(endDate[2], endDate[1] - 1, endDate[0]);
                    var today = new Date();
            
                    if (today >= endDateCreate) {
                        delete jsonData.Comments;
                        try {
                            await this.ajaxCreateWithJQuery("Contract", jsonData);
            
                            var requestData = { filters: { ContractNo: oModel.ContractNo, AgreementNo: AgreementNo }, data: oldContractData };

                            await this.ajaxUpdateWithJQuery("Contract", requestData);
            
                            this.getView().getModel("simpleForm").setProperty("/editable", false);
                            this.getView().getModel("simpleForm").setProperty("/Status", false);
            
                             this.closeBusyDialog(); //  Close BusyDialog
                            sap.m.MessageBox.success(this.i18nModel.getText("createNewContractSuccess"), {
                                onClose: function () {
                                    that.getRouter().navTo("RouteContract");
                                }
                            });
            
                        } catch (error) {
                             this.closeBusyDialog(); //  Close BusyDialog
                            sap.m.MessageBox.error(this.i18nModel.getText("createNewContractFailed"));
                        }
                    } else {
                         this.closeBusyDialog(); //  Close BusyDialog
                        this.getView().getModel("oFilteredContractModel").setProperty("/ContractStatus", this.ContractStatus);
                        sap.m.MessageBox.error(this.i18nModel.getText("renewEndDateMess"));
                    }
            
                } else {
                    // if (jsonData.ContractStatus === "Active") {
                    //     this.sendContractEmail();
                    // }
                    var requestData = { filters: { ContractNo: oModel.ContractNo, AgreementNo: AgreementNo }, data: jsonData };
                    try {
                        await this.ajaxUpdateWithJQuery("Contract", requestData);
            
                        // if (oModel.ContractStatus === "Inactive") {
                        //     await this.ajaxUpdateWithJQuery(`/Login('${oModel.ContractNo}')`, {}, []);
                        // }
            
                        this.getView().getModel("simpleForm").setProperty("/editable", false);
                        this.getView().getModel("simpleForm").setProperty("/Status", false);
                        this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                        this.byId("CU_id_Merge").setEnabled(true);
                        this.byId("CU_id_Mail").setEnabled(true);
                         this.closeBusyDialog(); //  Close BusyDialog
            
                        sap.m.MessageBox.success(this.i18nModel.getText("agreementUpdatedSuccess"), {
                            onClose: function () {
                                that.getRouter().navTo("RouteContract");
                            }
                        });
            
                    } catch (error) {
                         this.closeBusyDialog(); //  Close BusyDialog
                        sap.m.MessageToast.show(this.i18nModel.getText("updateContractFailed"));
                    }
                }
            },
        });
    });
