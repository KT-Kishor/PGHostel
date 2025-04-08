sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation",
  ],
  function (BaseController, JSONModel, MessageToast, utils) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.ManageAssignment",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteManageAssignment")
            .attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
          this._fetchCommonData("NewTask", "TaskModel", {});
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView()
            .getModel("LoginModel")
            .setProperty("/HeaderName", "Create New Assignment");
        },
        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
          this.getRouter().navTo("RouteLoginPage");
        },
        MA_onCreateTask: function () {
          this.manageTaskDetails(false); // false means create
        },

        MA_onEditTask: function () {
          this.manageTaskDetails(true); // true means edit
        },

        manageTaskDetails: function (bIsEdit) {
          const oView = this.getView();
          const oVisibleModel = new JSONModel({ save: false, submit: true });
          oView.setModel(oVisibleModel, "visiblePlay");

          let oModel;

          if (bIsEdit) {
            oVisibleModel.setProperty("/save", true);
            oVisibleModel.setProperty("/submit", false);

            const oTable = this.byId("MA_id_TaskTable");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
              return MessageToast.show("Please select a task to edit");
            }

            const oData = oSelectedItem
              .getBindingContext("TaskModel")
              .getObject();
            this._originalTaskData = JSON.parse(JSON.stringify(oData)); // deep copy
            oModel = new JSONModel(oData);
          } else {
            this._originalTaskData = null;
            const newTaskData = {
              TaskName: "",
              TaskType: "",
              TaskTypeDescription: "",
              StartDate: "",
              EndDate: "",
            };
            oModel = new JSONModel(newTaskData);
          }

          oView.setModel(oModel, "EditTaskModel");

          if (!this.oTaskDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.NewAssignment", // your fragment path
              controller: this,
            }).then(
              function (oDialog) {
                this.oTaskDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            this.oTaskDialog.open();
          }
        },
        NAF_onTaskClose: function () {
          if (this.oTaskDialog) {
            this.oTaskDialog.close();
          }
        },
        AT_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        // AT_validateDate:function(){
        //   utils._LCvalidateDate(oEvent); // Base validation
        //   this.validateStep(); // Step validation
        //   var oOfferDateId = oEvent.getSource().getId().split("--")[2];
        //   var releaseDate, joinDateVa;
        //   if (oOfferDateId === "TD_id_ReleaseDate" || oOfferDateId === "TU_id_RelDate") {
        //       joinDateVa = oOfferDateId === "TD_id_ReleaseDate" ? "TD_id_JoiningDate" : "TU_id_JoinDate";
        //       releaseDate = oEvent.getSource().getDateValue();
        //       if (releaseDate) {
        //           var oJoinDatePicker = this.byId(joinDateVa);
        //           var joinDate = oJoinDatePicker.getDateValue();
        //           oJoinDatePicker.setMinDate(releaseDate);
        //           if (joinDate && joinDate < releaseDate) {
        //               oJoinDatePicker.setValue("");
        //           } else {
        //               oJoinDatePicker.setValueState("None");
        //           }
        //       }
        //   }
        // },
        NAF_onSubmitTask: async function () {
          const oData = this.getView().getModel("EditTaskModel").getData();
          // Simple validation
          if (
            utils._LCvalidateMandatoryField(
              sap.ui.getCore().byId("FNA_id_TaskName"),
              "ID"
            ) &&
            utils._LCvalidateMandatoryField(
              sap.ui.getCore().byId("NAF_id_Description"),
              "ID"
            )
          ) {
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          var TaskType = sap.ui
            .getCore()
            .byId("FNA_id_Tasktype")
            .getSelectedKey();
          oData.TaskType = TaskType;

          const response = await this.ajaxCreateWithJQuery("NewTask", {
            data: oData,
          });
          if (response.success === true) {
            MessageToast.show("Task created successfully!");
            this.oTaskDialog.close();
            this._fetchCommonData("NewTask", "TaskModel", {});
          } else {
            MessageToast.show("Failed to create task.");
          }
        },
        MA_onPressSave: async function () {
          const oTable = this.byId("MA_id_TaskTable");
          const oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            MessageToast.show("Please select a task to update.");
            return;
          }

          const oData = this.getView().getModel("EditTaskModel").getData();
          const sTaskId = oSelectedItem
            .getBindingContext("TaskModel")
            .getProperty("TaskID");

          const requestData = { filters: { TaskID: sTaskId }, data: oData };

          const response = await this.ajaxUpdateWithJQuery(
            "/NewTask",
            requestData
          );

          if (response.success === true) {
            MessageToast.show("Task updated successfully!");
            this.oTaskDialog.close();
            this._fetchCommonData("NewTask", "TaskModel", {});
          } else {
            MessageToast.show("Failed to update task.");
          }
        },

        MA_onItemPress: function () {
          this.getRouter().navTo("RouteAssignTask");
        },
      }
    );
  }
);
