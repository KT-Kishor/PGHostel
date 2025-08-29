sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/model/json/JSONModel"
  ],
  function (BaseController,
    MessageToast,
    utils,
    JSONModel) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.TilePage",
      {
        onInit: function () {
          this._autoScrollTimer = null;
          this.getRouter()
            .getRoute("RouteTilePage")
            .attachMatched(this._onRouteMatched, this);
        },

        onExit: function () {
          // 3. Final, essential cleanup
          if (this._autoScrollTimer) {
            clearInterval(this._autoScrollTimer);
          }
        },

        _onRouteMatched: async function () {
          if (!this.that)
            this.that = this.getOwnerComponent()
              .getModel("ThisModel")
              ?.getData().that;
          var LoginFunction = await this.commonLoginFunction("TilePage");
          if (!LoginFunction) return;
          this.scrollToSection("id_ObjectPageLayoutTile", "id_Sectiontile");
          this.getBusyDialog();
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          await this._fetchCommonData(
            "getCompanyInvoice",
            "CompanyInvoiceModelData"
          );
          this.getView()
            .getModel("CompanyInvoiceModelData")
            .setProperty(
              "/length",
              this.getView().getModel("CompanyInvoiceModelData").getData()
                .length
            );
          await this._fetchCommonData("getMSAEndingSoon", "MSASOWModel");
          this.getView()
            .getModel("MSASOWModel")
            .setProperty(
              "/length",
              this.getView().getModel("MSASOWModel").getData().length
            );

            await this._fetchCommonData("getSOWEndingSoon", "SOWModel");
           this.getView().getModel("SOWModel").setProperty("/length",this.getView().getModel("SOWModel").getData().length);

          this.AppVisibilityReadCall();
          await this._fetchCommonData("AllLoginDetails", "EmpModel");
          await this._fetchCommonData("EmployeeDetails", "EmpDetails");

          this.CreateEmployeeModel();
          this.initializeBirthdayCarousel();
        },

        // onPressCC: function () {
        //   MessageToast.show("Implementation in progress");
        // },

        CreateEmployeeModel: function () {
          var empData = this.getView().getModel("EmpDetails").getData() || [];
          var filteredData = empData.filter(function (item) {
            return item.Role !== "Trainee" && item.Role !== "Contractor";
          });
          var oFilteredModel = new JSONModel(filteredData);
          this.getOwnerComponent().setModel(oFilteredModel, "EmployeeModel");
        },

        AppVisibilityReadCall: async function () {
          try {
            const oLoginModel = this.getView().getModel("LoginModel");
            if (!oLoginModel) return;

            const { Role } = oLoginModel.getData();
            const oData = await this.ajaxReadWithJQuery(
              "AppVisibility",
              { Role },
              []
            );
            this.closeBusyDialog();

            const firstEntry = Array.isArray(oData.data)
              ? oData.data[0]
              : oData.data;
            this.getOwnerComponent().setModel(
              new JSONModel(firstEntry),
              "AppVisibilityModel"
            );

            const tileNames = [
              "Home",
              "Timesheet",
              "Payslip",
              "OfferGeneration",
              "Invoice",
              "Quotation",
              "Expense",
              "ManageAsset",
              "Recruitment",
            ];

            const tileKeys = firstEntry.TileKey?.split(",") || [];
            const tileMapping = tileNames.reduce((map, name, i) => {
              map[name] = tileKeys[i] || "0";
              return map;
            }, {});

            this.getView().setModel(
              new JSONModel(tileMapping),
              "TileAccessModel"
            );
          } catch (oError) {
            MessageToast.show("Error in AppVisibilityReadCall");
          }
        },

        RP_onUseridpress: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        RP_onUsername: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },
        RP_onChangnewpass: function (oEvent) {
          utils._LCvalidatePassword(oEvent);
        },
        RP_onChangcomfirmpass: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        RP_onSelectUser: function () {
          var that = this;
          var oEmpCombo = sap.ui.getCore().byId("RP_id_userid"); // User ID input field
          var selectedKey = oEmpCombo.getSelectedKey(); // Get selected user ID

          if (!selectedKey) {
            oEmpCombo.setValueState("Error");
            return;
          } else {
            oEmpCombo.setValueState("None");
          }
          var oEmpModel = this.getView().getModel("EmpModel"); // Fetch employee model
          if (!oEmpModel) {
            MessageToast.show(that.i18nModel.getText("noemp"));
            return;
          }
          var aEmployees = oEmpModel.getProperty("/"); // Get employee data array
          // Find selected employee by EmployeeID
          var selectedEmployee = aEmployees.find(function (emp) {
            return emp.EmployeeID === selectedKey;
          });
          if (selectedEmployee) {
            // Ensure FragmentModel exists
            var oFragmentModel = this.getView().getModel("FragmentModel");
            if (!oFragmentModel) {
              oFragmentModel = new JSONModel({});
              this.getView().setModel(oFragmentModel, "FragmentModel");
            }
            // Set EmployeeID and EmployeeName in the model
            oFragmentModel.setProperty(
              "/EmployeeID",
              selectedEmployee.EmployeeID
            );
            oFragmentModel.setProperty(
              "/EmployeeName",
              selectedEmployee.EmployeeName
            );
            // Automatically populate the username field
            var oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
            oUserNameInput.setValue(selectedEmployee.EmployeeName);
            oUserNameInput.setValueState("None");
            // Clear password fields
            sap.ui
              .getCore()
              .byId("RP_id_NewPW")
              .setValue("")
              .setValueState("None");
            sap.ui
              .getCore()
              .byId("RP_id_ConfirmPW")
              .setValue("")
              .setValueState("None");
          } else {
            MessageToast.show(that.i18nModel.getText("empnotfound"));
          }
        },
        TP_onupdatepress: function () {
          var oView = this.getView();
          // Ensure user selection is reset before opening
          var oFragmentModel = this.getView().getModel("FragmentModel");
          if (oFragmentModel) {
            oFragmentModel.setData({ EmployeeID: "", EmployeeName: "" });
          }
          if (!this.oUpdatePass) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.ResetPassword",
              controller: this,
            }).then(
              function (oUpdatePass) {
                this.oUpdatePass = oUpdatePass;
                oView.addDependent(this.oUpdatePass);
                this.oUpdatePass.open();
              }.bind(this)
            );
          } else {
            this.oUpdatePass.open();
          }
        },
        RP_onPressCanclePW: function () {
          sap.ui
            .getCore()
            .byId("RP_id_userid")
            .setValue("")
            .setSelectedKey("")
            .setValueState("None");
          sap.ui.getCore().byId("RP_id_userid").setSelectedKey(null);
          var oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
          // Reset all input fields
          oUserNameInput.setValue("");
          oUserNameInput.setValueState("None");
          sap.ui
            .getCore()
            .byId("RP_id_NewPW")
            .setValue("")
            .setValueState("None");
          sap.ui
            .getCore()
            .byId("RP_id_ConfirmPW")
            .setValue("")
            .setValueState("None");
          // Close dialog
          if (this.oUpdatePass) {
            this.oUpdatePass.close();
          }
        },
        RP_onPressSetSave: async function () {
          const oUserIdInput = sap.ui.getCore().byId("RP_id_userid");
          const oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
          const oNewPwInput = sap.ui.getCore().byId("RP_id_NewPW");
          const oConfirmPwInput = sap.ui.getCore().byId("RP_id_ConfirmPW");
          const frgUserId = oUserIdInput.getValue();
          const newPassword = oNewPwInput.getValue();
          const confirmPassword = oConfirmPwInput.getValue();
          // Validate inputs
          if (
            !utils._LCvalidateMandatoryField(oUserIdInput, "ID") ||
            !utils._LCvalidateName(oUserNameInput, "ID") ||
            !utils._LCvalidatePassword(oNewPwInput, "ID") ||
            !utils._LCvalidateMandatoryField(oConfirmPwInput, "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          if (newPassword !== confirmPassword) {
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("Error");
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          }
          try {
            this.getBusyDialog();
            const response = await this.ajaxUpdateWithJQuery("LoginDetails", {
              data: {
                Password: btoa(newPassword),
              },
              filters: {
                EmployeeID: frgUserId,
              },
            });
            if (response.success === true) {
              this.closeBusyDialog();
              sap.ui.getCore().byId("RP_id_userid").setSelectedKey(null);
              sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("None");
              oUserIdInput.setValue("");
              oUserNameInput.setValue("");
              oNewPwInput.setValue("");
              oConfirmPwInput.setValue("");
              const oModel = this.getView().getModel("EmpModel");
              if (oModel) {
                oModel.refresh(true);
              }
              if (this.oUpdatePass) {
                this.oUpdatePass.close();
              }

              MessageToast.show(this.i18nModel.getText("updatepassword"));
            } else {
              MessageToast.show("Failed to update password.");
            }
          } catch (err) {
            MessageToast.show("An error occurred: " + err.message);
          }
        },
        RP_onComPass: function () {
          const oNewPwInput = sap.ui.getCore().byId("RP_id_NewPW");
          const oConfirmPwInput = sap.ui.getCore().byId("RP_id_ConfirmPW");
          const newPassword = oNewPwInput.getValue();
          const confirmPassword = oConfirmPwInput.getValue();
          if (newPassword !== confirmPassword) {
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("Error");
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          } else {
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("None");
          }
        },
        //password visibility change
        RP_onTogglePasswordVisibility: function (oEvent) {
          var oInput = oEvent.getSource();
          var sType = oInput.getType() === "Password" ? "Text" : "Password";
          oInput.setType(sType);

          // Toggle the value help icon properly without losing the value
          var sIcon =
            sType === "Password" ? "sap-icon://show" : "sap-icon://hide";
          oInput.setValueHelpIconSrc(sIcon);

          // Ensure the current value of the password is retained
          var sCurrentValue = oInput.getValue(); // Get the current value before toggling
          oInput.setValue(sCurrentValue);
        },

        TileV_onpressTrainee: function () {
          this.getRouter().navTo("RouteTrainee", { value: "Trainee" });
        },
        TileV_onPressOffer: function () {
          //this.getBusyDialog();
          this.getRouter().navTo("RouteEmployeeOffer", {
            valueEmp: "EmployeeOffer",
          });
        },
        TileV_onpresslistofholidays: function () {
          this.getRouter().navTo("RouteListofholidays");
        },
        TileV_onpressIDCARD: function () {
          this.getRouter().navTo("RouteIDCardApplication");
        },
        TileV_onpressLeave: function () {
          this.getRouter().navTo("RouteAdminApplyLeave");
        },
        TileV_onpressConsultantInvoice: function () {
          this.getRouter().navTo("RouteConsultantInvoiceApplication");
        },
        TileV_onpressContract: function () {
          this.getRouter().navTo("RouteContract", { valueEmp: "Contract" });
        },
        TileV_onPressAdminPaySlip: function () {
          this.that.getBusyDialog();
          this.getRouter().navTo("RouteAdminPaySlip");
        },
        TileV_onpressSelfservice: function () {
          this.getRouter().navTo("SelfService", {
            sPath: "SelfService",
            Role: "Role",
          });
        },
        TileV_onpressInbox: function () {
          this.getRouter().navTo("RouteMyInbox", { sMyInBox: "MyInboxView" });
        },
        TileV_onpressInvoiceApp: function () {
          this.getRouter().navTo("RouteCompanyInvoice");
        },
        TileV_onpressQuotation: function () {
          sap.ui.core.BusyIndicator.show(0);
          this.getRouter().navTo("RouteQuotation");
        },
        TileV_onpressAssignment: function () {
          this.getRouter().navTo("RouteManageAssignment");
        },
        TileV_onpresstimesheet: function () {
          this.getRouter().navTo("RouteTimesheet");
        },
        TileV_onPressTimesheetApp: function () {
          this.getRouter().navTo("RouteTimesheetApproval");
        },
        TileV_onPressGenerateSalary: function () {
          this.getRouter().navTo("RouteGenerateSalary");
        },
        TileV_onPressManagePayroll: function () {
          this.getRouter().navTo("RouteManagePayroll");
        },
        TileV_onpressEmployeeDetails: function () {
          this.getRouter().navTo("RouteEmployeeDetails", {
            sPath: "EmployeeDetails",
          });
        },
        TileV_onBackPress: function () {
          this.CommonLogoutFunction();
        },
        TileV_onpressAddCustomer: function () {
          this.getRouter().navTo("RouteManageCustomer", {
            value: "ManageCustomer",
          });
        },
        TileV_onpressMSA: function () {
          this.getRouter().navTo("RouteMSA");
        },
        TileV_onpressExpenseApp: function () {
          // this.getBusyDialog();
          this.getRouter().navTo("RouteExpensePage");
        },
        TileV_onPressManageSchemeUpload: function () {
          this.getRouter().navTo("RouteSchemeUpload", {
            value: "SchemeUpload",
          });
        },
        TileV_onPressIncomeAsset: function () {
          this.getRouter().navTo("RouteIncomeAsset");
        },
        TileV_onPressAssetAssignment: function () {
          this.getRouter().navTo("RouteAssetAssignment");
        },
        TileV_onPressHrQuotation: function () {
          this.getRouter().navTo("RouteHrQuotation");
        },
        TileV_MyAsset: function () {
          this.getRouter().navTo("MyAsset");
        },
        TileV_onpressPoApp: function () {
          this.getRouter().navTo("PurchaseOrder");
        },
        TileV_Recruitment: function () {
          this.getRouter().navTo("Recruitment");
        },
        TileV_RecruitementDashbord: function () {
          this.getRouter().navTo("AppliedCandidates");
        },
        TileV_JobPosting: function () {
          this.getRouter().navTo("RouteHP_View");
        },

        // OnPressNavigationMsaDet: function (oEvent) {
        //   var MsaID = oEvent
        //     .getSource()
        //     .getBindingContext("MSASOWModel")
        //     .getProperty("MsaID");
        //   this.getRouter().navTo("RouteMSAEdit", { sPath: MsaID });
        // },

        // CI_onPressInvoiceRow: function (oEvent) {
        //   var Path = encodeURIComponent(
        //     oEvent
        //       .getSource()
        //       .getBindingContext("CompanyInvoiceModelData")
        //       .getObject().InvNo
        //   );
        //   this.getRouter().navTo("RouteCompanyInvoiceDetails", { sPath: Path });
        // },

        TileV_onpressInvoiceDashboard: function () {
          this.getRouter().navTo("RouteInvoiceDashboard");
        },
        TileV_onpressExpenseInvoiceDashboard:function(){
          this.getRouter().navTo("ExpenseInvoice");
        },
onTileRefresh: async function () {
    this.getBusyDialog();
    const backendModels = {
        EmpModel: "EmployeeDetails",
        traineeModel: "Trainee",
        EmailContent: "AppVisibility",
        LeaveModel: "Leaves",
        LeaveTypeModel: "Leaves"
    };
    await Promise.allSettled(
        Object.entries(backendModels).map(([model, entity]) =>
            this._fetchCommonData(entity, model).catch(err => {
                console.warn(`Failed fetching: ${entity} → ${model}`, err);
            })
        )
    );
    this.closeBusyDialog();
    MessageToast.show("Data Refreshed Successfully");
  },
     UploadCountryData:function(){
      let oView = this.getView()
         if (!this.oLeaveDialog) {
        sap.ui.core.Fragment.load({
            name: "sap.kt.com.minihrsolution.fragment.AddHolidayList",
            controller: this,
        }).then(function (oLeaveDialog) {
            this.oLeaveDialog = oLeaveDialog;
            oView.addDependent(this.oLeaveDialog);
            this.oLeaveDialog.setTitle("Upload country data");
            this.oLeaveDialog.open();
            sap.ui.getCore().byId("ALH_id_Date").setVisible(false);
            sap.ui.getCore().byId("ALH_id_fileuploaderLabele").setRequired(false);
            
        }.bind(this));
    } else {
        // this._resetDialogFields();
        this.oLeaveDialog.open();
          this.oLeaveDialog.setTitle("Upload country data");
        sap.ui.getCore().byId("ALH_id_Date").setVisible(false);
        sap.ui.getCore().byId("ALH_id_fileuploaderLabele").setRequired(false);
     
    }
  },
  LOH_onPressClose:function(){
    sap.ui.getCore().byId("ALH_id_LocFileUpload").setValue("");
    this.oLeaveDialog.close();
    this.oLeaveDialog.destroy();
     this.oLeaveDialog = null;
  },

  LOH_onUpload:function(oEvent){
    var oFile = oEvent.getParameter("files")[0];
    if (oFile) {
        var reader = new FileReader();

        reader.onload = function(e) {
            // Convert file into array buffer
            var data = new Uint8Array(e.target.result);

            // Read workbook
            var workbook = XLSX.read(data, { type: 'array' });

            // Take first sheet
            var sheetName = workbook.SheetNames[0];
            var sheet = workbook.Sheets[sheetName];

            // Convert sheet → JSON
            this.jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            // console.log("Excel JSON Data:", this.jsonData);
     
        }.bind(this);

        reader.readAsArrayBuffer(oFile);
    }
  },

  LOH_onPressSubmit:function(){    
        let that = this
          let stdcodeavlue = sap.ui.getCore().byId("TP_id_STDCode").getValue();
          let currencyavlue = sap.ui.getCore().byId("TP_id_Currency").getValue();
          let branchcodevlue =  sap.ui.getCore().byId("TP_id_BranchCode").getValue();
          let cityvlue = sap.ui.getCore().byId("TP_id_City").getValue();
          let statevlue = sap.ui.getCore().byId("TP_id_State").getValue();
          let countryavlue = sap.ui.getCore().byId("TP_id_Country").getValue();
          let countrycode = sap.ui.getCore().byId("TP_id_CountryCode").getValue();

           const formData = {
    city: cityvlue,
    branchCode: branchcodevlue,
    state: statevlue,
    CountryCode: countrycode,
    Country: countryavlue,
    STDCode: stdcodeavlue,
    Currency: currencyavlue
  }

   if(this.jsonData){
    // let fileEmpty = sap.ui.getCore().byId("ALH_id_LocFileUpload").getValue();
    // if(!fileEmpty){
    //    sap.m.MessageToast.show("Please select file");
    //    return;
    // } 
  //   let dataformat = this.jsonData.map((elem)=>{
  //   return {
  //       ...elem,                
  //       STDCode: `+${elem.STDCode}`
  //   };
  //  })

if(this.jsonData.length <= 0){
        sap.m.MessageToast.show("Fill is empty");
       return;
      }
      this.sendExcelfileData=this.jsonData;
   } else{
      this.sendExcelfileData=formData
      if(this.sendExcelfileData.city=== "" || 
         this.sendExcelfileData.state=== "" || this.sendExcelfileData.CountryCode=== "" || this.sendExcelfileData.Country=== "" ||
         this.sendExcelfileData.STDCode=== "" || this.sendExcelfileData.Currency=== ""){
            sap.m.MessageToast.show("Please Fill Data");
    return;
        }
      
   }

    const datafromexcel = {data: this.sendExcelfileData};
     that.getBusyDialog();
     that.ajaxCreateWithJQuery("BaseLocation", datafromexcel).then((res)=>{
     that.closeBusyDialog();
     sap.ui.getCore().byId("ALH_id_LocFileUpload").setValue("");
     that.LOH_onPressClose();
    sap.m.MessageToast.show("Data saved successfully");
     }).catch((error)=>{
      sap.m.MessageToast.show("Duplicate data in file");
       that.closeBusyDialog();
     });
  },
  onDownloadTemplatexlsx:function(){
    let fileUrl = window.location.origin.split("index")[0] + "/Template.xlsx";
      sap.m.URLHelper.redirect(fileUrl, true)
  }
  });
});
