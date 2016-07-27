/**
 * ### Форма документа _Заказ покупателя_
 * 
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * 
 * @module doc_buyers_order_form_obj
 */

(function($p){

	var _mgr = $p.doc.buyers_order;


	_mgr.form_obj = function(pwnd, attr){

		var o, wnd, evts = [], attr_on_close = attr.on_close;

		attr.draw_pg_header = function (o, wnd) {

			function layout_resize_finish() {
				setTimeout(function () {
					if(wnd.elmnts.layout_header.setSizes){
						wnd.elmnts.layout_header.setSizes();
						wnd.elmnts.pg_left.objBox.style.width = "100%";
						wnd.elmnts.pg_right.objBox.style.width = "100%";
					}
				}, 200);
			}

			// в зависимости от статуса
			setTimeout(set_editable, 50);

			/**
			 *	закладка шапка
			 */
			wnd.elmnts.layout_header = wnd.elmnts.tabs.tab_header.attachLayout('3U');

			wnd.elmnts.layout_header.attachEvent("onResizeFinish", layout_resize_finish);

			wnd.elmnts.layout_header.attachEvent("onPanelResizeFinish", layout_resize_finish);

			/**
			 *	левая колонка шапки документа
			 */
			wnd.elmnts.cell_left = wnd.elmnts.layout_header.cells('a');
			wnd.elmnts.cell_left.hideHeader();
			wnd.elmnts.pg_left = wnd.elmnts.cell_left.attachHeadFields({
				obj: o,
				pwnd: wnd,
				read_only: wnd.elmnts.ro,
				oxml: {
					" ": [{id: "number_doc", path: "o.number_doc", synonym: "Номер", type: "ro", txt: o.number_doc},
						{id: "date", path: "o.date", synonym: "Дата", type: "ro", txt: $p.moment(o.date).format($p.moment._masks.date_time)}
					],
					"Контактная информация": ["partner",
						{id: "shipping_address", path: "o.shipping_address", synonym: "Адрес доставки", type: "txt", txt: o["shipping_address"]}
					],
					"Дополнительные реквизиты": [
						{id: "obj_delivery_state", path: "o.obj_delivery_state", synonym: "Состояние транспорта", type: "ro", txt: o["obj_delivery_state"].presentation}
					]
				}
			});

			/**
			 *	правая колонка шапки документа
			 * TODO: задействовать либо удалить choice_links
			 * var choice_links = {contract: [
				 * {name: ["selection", "owner"], path: ["partner"]},
				 * {name: ["selection", "organization"], path: ["organization"]}
				 * ]};
			 */

			wnd.elmnts.cell_right = wnd.elmnts.layout_header.cells('b');
			wnd.elmnts.cell_right.hideHeader();
			wnd.elmnts.pg_right = wnd.elmnts.cell_right.attachHeadFields({
				obj: o,
				pwnd: wnd,
				read_only: wnd.elmnts.ro,
				oxml: {
					"Налоги": ["vat_consider", "vat_included"],
					"Аналитика": ["project",
						{id: "organization", path: "o.organization", synonym: "Организация", type: "refc", txt: o["organization"].presentation},
						"contract", "organizational_unit", "department"],
					"Итоги": [
						{id: "doc_currency", path: "o.doc_currency", synonym: "Валюта документа", type: "ro", txt: o["doc_currency"].presentation},
						{id: "doc_amount", path: "o.doc_amount", synonym: "Сумма", type: "ron", txt: o["doc_amount"]}
					]
				}
			});

			/**
			 *	редактор комментариев
			 */
			wnd.elmnts.cell_note = wnd.elmnts.layout_header.cells('c');
			wnd.elmnts.cell_note.hideHeader();
			wnd.elmnts.cell_note.setHeight(100);
			wnd.elmnts.cell_note.attachHTMLString("<textarea class='textarea_editor'>" + o.note + "</textarea>");

		};

		attr.toolbar_struct = $p.injected_data["toolbar_buyers_order_obj.xml"];

		attr.toolbar_click = toolbar_click;

		attr.on_close = frm_close;

		return this.constructor.prototype.form_obj.call(this, pwnd, attr)
			.then(function (res) {
				if(res){
					o = res.o;
					wnd = res.wnd;
					return res;
				}
			});


		/**
		 * обработчик нажатия кнопок командных панелей
		 */
		function toolbar_click(btn_id){

			switch(btn_id) {

				case 'btn_sent':
					save("sent");
					break;

				case 'btn_save':
					save("save");
					break;

				case 'btn_save_close':
					save("close");
					break;

				case 'btn_retrieve':
					save("retrieve");
					break;

				case 'btn_post':
					save("post");
					break;

				case 'btn_unpost':
					save("unpost");
					break;


				case 'btn_close':
					wnd.close();
					break;

				case 'btn_add_builder':
					open_builder(true);
					break;

				case 'btn_add_product':
					$p.dp.buyers_order.form_product_list(wnd, process_add_product);
					break;

				case 'btn_add_material':
					add_material();
					break;

				case 'btn_edit':
					open_builder();
					break;

				case 'btn_spec':
					open_spec();
					break;

				case 'btn_discount':

					break;


				case 'btn_go_connection':
					go_connection();
					break;
			}

			if(btn_id.substr(0,4)=="prn_")
				_mgr.print(o, btn_id, wnd);
		}


		/**
		 * показывает список связанных документов
		 */
		function go_connection(){
			$p.msg.show_not_implemented();
		}

		/**
		 * обработчик выбора значения в таблице продукции (ссылочные типы)
		 */
		function production_on_value_select(v){
			this.row[this.col] = v;
			this.cell.setValue(v.presentation);
			production_on_value_change();
		}

		/**
		 * РассчитатьСпецификациюСтроки() + ПродукцияПриОкончанииРедактирования()
		 * при изменении строки табчасти продукции
		 */
		function production_on_value_change(rId){

			wnd.progressOn();
			// TODO: _mgr.save
			//_mgr.save({
			//	ref: o.ref,
			//	row: rId!=undefined ? rId : production_get_sel_index(),
			//	o: o._obj,
			//	action: "calc",
			//	specify: "production"
			//}).then(function(res){
			//	if(!$p.msg.check_soap_result(res))
			//		wnd.reflect_characteristic_change(res); // - перезаполнить шапку и табчасть
			//	wnd.progressOff();
			//});
		}

		/**
		 * обработчик активизации строки продукции
		 */
		function production_on_row_activate(rId, cInd){
			var row = o["production"].get(rId-1),
				sfields = this.getUserData("", "source").fields,
				rofields = "nom,characteristic,qty,len,width,s,quantity,unit",
				pval;


			if($p.utils.is_data_obj(row.ordn) && !row.ordn.empty()){
				for(var i in sfields)
					if(rofields.indexOf(sfields[i])!=-1){
						pval = this.cells(rId, Number(i)).getValue();
						this.setCellExcellType(rId, Number(i), "ro");
						if($p.utils.is_data_obj(pval))
							this.cells(rId, Number(i)).setValue(pval.presentation);
					}
			}
		}

		/**
		 * обработчик изменения значения в таблице продукции (примитивные типы)
		 */
		function production_on_edit(stage, rId, cInd, nValue, oValue){
			if(stage != 2 || nValue == oValue) return true;
			var fName = this.getUserData("", "source").fields[cInd], ret_code;
			if(fName == "note"){
				ret_code = true;
				o["production"].get(rId-1)[fName] = nValue;
			} else if (!isNaN(Number(nValue))){
				ret_code = true;
				o["production"].get(rId-1)[fName] = Number(nValue);
			}
			if(ret_code){
				setTimeout(function(){ production_on_value_change(rId-1); } , 0);
				return ret_code;
			}
		}


		/**
		 * вспомогательные функции
		 */

		function save(action){

			function do_save(post){

				if(!wnd.elmnts.ro){
					o.note = wnd.elmnts.cell_note.cell.querySelector("textarea").value.replace(/&nbsp;/g, " ").replace(/<.*?>/g, "").replace(/&.{2,6};/g, "");
					wnd.elmnts.pg_left.selectRow(0);
				}

				o.save(post)
					.then(function(){

						if(action == "sent" || action == "close")
							wnd.close();
						else{
							wnd.set_text();
							set_editable();
						}

					})
					.catch(function(err){
						$p.record_log(err);
					});
			}

			if(action == "sent"){
				// показать диалог и обработать возврат
				dhtmlx.confirm({
					title: $p.msg.order_sent_title,
					text: $p.msg.order_sent_message,
					cancel: $p.msg.cancel,
					callback: function(btn) {
						if(btn){
							// установить транспорт в "отправлено" и записать
							o.obj_delivery_state = $p.enm.obj_delivery_states.Отправлен;
							do_save();
						}
					}
				});

			} else if(action == "retrieve"){
				// установить транспорт в "отозвано" и записать
				o.obj_delivery_state =  $p.enm.obj_delivery_states.Отозван;
				do_save();

			} else if(action == "save" || action == "close"){
				do_save();

			}else if(action == "post"){
				do_save(true);

			}else if(action == "unpost"){
				do_save(false);
			}
		}

		function frm_close(){

			// выгружаем из памяти всплывающие окна скидки и связанных файлов
			["vault", "vault_pop", "discount", "discount_pop"].forEach(function (elm) {
				if (wnd && wnd.elmnts && wnd.elmnts[elm] && wnd.elmnts[elm].unload)
					wnd.elmnts[elm].unload();
			});

			evts.forEach(function (id) {
				$p.eve.detachEvent(id);
			});

			if(typeof attr_on_close == "function")
				attr_on_close();

			return true;
		}

		function set_editable(){

			// статусы
			var st_draft = $p.enm.obj_delivery_states.Черновик,
				st_retrieve = $p.enm.obj_delivery_states.Отозван,
				retrieve_enabed, detales_toolbar;

			wnd.elmnts.pg_right.cells("vat_consider", 1).setDisabled(true);
			wnd.elmnts.pg_right.cells("vat_included", 1).setDisabled(true);

			wnd.elmnts.ro = false;

			// технолог может изменять шаблоны
			if(o.obj_delivery_state == $p.enm.obj_delivery_states.Шаблон){
				wnd.elmnts.ro = !$p.current_acl.role_available("МенеджерПоПродажам");

				// ведущий менеджер может изменять проведенные
			}else if(o.posted || o._deleted){
				wnd.elmnts.ro = !$p.current_acl.role_available("МенеджерПоПродажам");

			}else if(!wnd.elmnts.ro && !o.obj_delivery_state.empty())
				wnd.elmnts.ro = o.obj_delivery_state != st_draft && o.obj_delivery_state != st_retrieve;

			retrieve_enabed = !o._deleted &&
				(o.obj_delivery_state == $p.enm.obj_delivery_states.Отправлен || o.obj_delivery_state == $p.enm.obj_delivery_states.Отклонен);

			wnd.elmnts.grids.goods.setEditable(!wnd.elmnts.ro);
			wnd.elmnts.pg_left.setEditable(!wnd.elmnts.ro);
			wnd.elmnts.pg_right.setEditable(!wnd.elmnts.ro);

			// гасим кнопки проведения, если недоступна роль
			if(!$p.current_acl.role_available("МенеджерПоПродажам")){
				wnd.elmnts.frm_toolbar.hideItem("btn_post");
				wnd.elmnts.frm_toolbar.hideItem("btn_unpost");
			}

			// кнопки записи и отправки гасим в зависимости от статуса
			if(wnd.elmnts.ro){
				wnd.elmnts.frm_toolbar.disableItem("btn_sent");
				wnd.elmnts.frm_toolbar.disableItem("btn_save");

				detales_toolbar = wnd.elmnts.tabs.tab_goods.getAttachedToolbar();
				detales_toolbar.forEachItem(function(itemId){
					detales_toolbar.disableItem(itemId);
				});

			}else{
				// шаблоны никогда не надо отправлять
				if(o.obj_delivery_state == $p.enm.obj_delivery_states.Шаблон)
					wnd.elmnts.frm_toolbar.disableItem("btn_sent");
				else
					wnd.elmnts.frm_toolbar.enableItem("btn_sent");

				wnd.elmnts.frm_toolbar.enableItem("btn_save");

				detales_toolbar = wnd.elmnts.tabs.tab_goods.getAttachedToolbar();
				detales_toolbar.forEachItem(function(itemId){
					detales_toolbar.enableItem(itemId);
				});
			}
			if(retrieve_enabed)
				wnd.elmnts.frm_toolbar.enableListOption("bs_more", "btn_retrieve");
			else
				wnd.elmnts.frm_toolbar.disableListOption("bs_more", "btn_retrieve");
		}


	}

})($p);
